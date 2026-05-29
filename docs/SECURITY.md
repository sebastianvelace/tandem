# Tandem — Seguridad

> Modelo de amenazas, controles y checklist pre-deploy. Cubre §6.15 (SEC-01..06) del spec y los principios ARQ-11, ARQ-06, ARQ-12.

---

## 1. Postura general

- **Todo es privado salvo login y assets** (ARQ-11, SEC-01). No hay endpoints públicos de datos (SEC-03).
- **Defensa en profundidad** (ADR-004): autorización en la capa de aplicación (Server Actions) **+** RLS en Postgres.
- **Datos de clientes = PII sensible** (D30, SEC-03); contratos/documentos legales fuera de alcance (CLI-10).
- **HTTPS siempre** (SEC-02), tokens OAuth **cifrados at rest** (SEC-06), app **no indexable** (SEC-05).

---

## 2. Threat model (STRIDE simplificado)

| Categoría | Amenaza concreta en Tandem | Control |
|---|---|---|
| **S**poofing | Suplantar a un cofounder | Solo Google OAuth (sin contraseñas propias); sesión en cookie httpOnly/secure/sameSite. |
| **T**ampering | Modificar `workspace_id`/IDs en requests para tocar datos ajenos | `assertMembership` en cada action + RLS por `workspace_id`; nunca confiar en IDs del cliente. |
| **R**epudiation | Negar haber cambiado/borrado algo | `created_by`, `edited_at`, `deleted_at`, `completed_at`; auditoría de cambios de estado en fase 2 (SCL-04). |
| **I**nformation disclosure | Fuga cross-workspace, PII en logs, tokens en bundle | RLS, scrubbing de PII en logs, secrets server-only, tokens cifrados. |
| **D**enial of service | Spam de mensajes/tareas o de login | Rate limiting en auth y mutaciones; paginación; índices. |
| **E**levation of privilege | Member actuando como admin | Comprobación de `role` en acciones admin (invitar, eliminar área, export). |

**Activos críticos**: tokens de Google Calendar, PII de clientes, contenido de chat/tareas, integridad del aislamiento por workspace.

---

## 3. Autenticación

- **Único método**: Google OAuth vía Supabase Auth. No existe registro con contraseña ni magic link en MVP (AUTH-01). No hay bypass.
- **Scopes** combinados: `openid email profile https://www.googleapis.com/auth/calendar.events`, con `access_type=offline` + `prompt=consent` (para `refresh_token`).
- **Sesión**: cookies gestionadas por Supabase SSR → `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. No se expone el token de sesión a JS.
- **CSRF**: las mutaciones son **Server Actions** (POST same-origin con token de acción de Next.js) → protección CSRF nativa. Los Route Handlers mutantes (`/api/calendar/connect`) validan origen + sesión. Cron usa `CRON_SECRET` en header.
- **Logout** (AUTH-05): invalida sesión en Supabase y limpia cookies.
- **Sesión persistente** desktop (AUTH-04) con refresh de Supabase; expiración razonable.

---

## 4. Autorización

### 4.1 Capa de aplicación (barrera principal)
- `assertMembership(workspaceId, userId)` se ejecuta al inicio de **toda** action/handler de datos. Devuelve el `role` para checks adicionales.
- Acciones de **admin** (invitar miembro WS-04, editar/eliminar área AREA-09, export SEC-04) verifican `role IN ('admin')`.
- Reglas de propiedad: solo el **autor** edita/borra su mensaje (MSG-05/06); solo creador/admin elimina área (AREA-09).
- `task.parent_id`: validar que padre e hijo comparten `workspace_id` y `area_id` (raíz) y que no se forma ciclo.

### 4.2 RLS (segunda barrera, hace seguras las suscripciones Realtime)
Política base por tabla con `workspace_id`:

```sql
-- Ejemplo: tasks
alter table tasks enable row level security;

create policy tasks_select on tasks for select
  using (workspace_id in (
    select workspace_id from memberships where user_id = auth.uid()
  ));

create policy tasks_modify on tasks for all
  using (workspace_id in (
    select workspace_id from memberships where user_id = auth.uid()
  ))
  with check (workspace_id in (
    select workspace_id from memberships where user_id = auth.uid()
  ));
```
Patrón análogo en `areas`, `clients`, `messages`, `notifications` (esta además filtra `recipient_user_id = auth.uid()` para SELECT), `calendar_*`. El cliente del navegador (anon key + sesión) **solo** puede leer su workspace; las escrituras van por Server Actions (service role) con authz explícita.

### 4.3 Anti-IDOR
- IDs en URL (`/areas/[areaId]`, tarea, cliente) se resuelven **siempre** filtrando por workspace del usuario. Un ID ajeno devuelve 404, no 403 (no revela existencia).
- Tests obligatorios de IDOR sobre tasks, messages, clients (Prompt 6 / TESTING-STRATEGY).

---

## 5. Protección de datos (PII de clientes)

- PII (`clients.name/email/phone/notes`) **nunca** en logs ni en mensajes de error; logger con scrubbing de campos sensibles.
- Solo miembros del workspace ven clientes (CLI-11) — vía RLS.
- Sin endpoints públicos; sin exposición en bundle cliente más allá de lo que el usuario ya puede ver autenticado.
- Export JSON (SEC-04) solo admin, descarga autenticada, no cacheable.
- Retención: borrado permanente desde Archivo (ARC-06) elimina la fila; export bajo demanda.

---

## 6. OAuth token encryption at rest (SEC-06)

- `access_token` y `refresh_token` de Google se cifran con **AES-256-GCM** (`src/lib/crypto.ts`) usando `TOKEN_ENC_KEY` (32 bytes, base64, env server-only) antes de persistir en `calendar_connections.*_enc (bytea)`.
- Cada cifrado usa **IV aleatorio**; se almacena `iv || ciphertext || authTag`.
- Descifrado solo en el servidor justo antes de llamar a Calendar; el `access_token` se refresca on-demand si expiró.
- Rotación de `TOKEN_ENC_KEY` documentada en DEPLOY (re-cifrado por migración). Alternativa fase 2: Supabase Vault.

---

## 7. Validación de entrada y salida

- **Zod** valida el body de **toda** mutación server-side antes de tocar la DB (límites: título ≤200, body mensaje, email/teléfono formato, enums). Esquemas compartidos en `src/lib/zod/`.
- **XSS**: el chat es solo texto; al renderizar se escapa (React por defecto) y los links se detectan y se renderizan con `rel="noopener noreferrer nofollow"` y `target="_blank"`; **no** se usa `dangerouslySetInnerHTML`. Sanitización de URLs (solo `http(s):`/`mailto:`).
- **SQL injection**: Drizzle parametriza; prohibido `sql.raw` con interpolación de input sin `sql` placeholders. Lint/review lo verifica.
- **Mass assignment**: las actions seleccionan campos permitidos explícitamente; no se hace spread del body en el `insert/update`.

---

## 8. Rate limiting

- **Auth/callback**: límite por IP (ej. 10/min) para frenar abuso de OAuth.
- **Mutaciones** (mensajes, tareas): límite por usuario (ej. 60/min) con `@upstash/ratelimit` o middleware ligero; evita spam y loops.
- **Cron**: protegido por `CRON_SECRET`; rechaza sin header válido.

---

## 9. Secrets management

- Secrets en **Vercel Env Vars** por entorno (Production/Preview/Development). Nunca en el repo.
- Server-only (sin `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `SENTRY_DSN`.
- `.gitignore` incluye `.env*` (verificado en checklist). `.env.example` sin valores reales.
- No secrets en el client bundle (verificación: build + grep de claves).

---

## 10. HTTPS y headers de seguridad

Configurar en `next.config.ts` (headers) y/o `vercel.json`:

| Header | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (HSTS) |
| `Content-Security-Policy` | `default-src 'self'; connect-src 'self' https://*.supabase.co https://www.googleapis.com; img-src 'self' https://*.googleusercontent.com data:; font-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

HTTPS forzado por Vercel; redirección http→https automática.

---

## 11. robots / noindex (SEC-05)

`public/robots.txt`:
```
User-agent: *
Disallow: /
```
Además `<meta name="robots" content="noindex, nofollow">` en el layout y header `X-Robots-Tag: noindex`. Sin enlaces desde la web pública (§3.4). La protección real es la autenticación obligatoria, no la oscuridad de la URL.

---

## 12. OWASP Top 10 — estado

| OWASP | Estado | Control |
|---|---|---|
| A01 Broken Access Control | Mitigado | authz app + RLS + anti-IDOR + checks de rol |
| A02 Cryptographic Failures | Mitigado | HTTPS, tokens AES-256-GCM, cookies seguras |
| A03 Injection | Mitigado | Drizzle parametrizado, Zod, escape XSS |
| A04 Insecure Design | Mitigado | threat model, multi-tenant desde diseño |
| A05 Security Misconfiguration | Mitigado | headers, secrets, RLS por defecto deny |
| A06 Vulnerable Components | Vigilar | `npm audit` en CI, Dependabot |
| A07 Auth Failures | Mitigado | OAuth gestionado, rate limit, sesión segura |
| A08 Data Integrity Failures | Mitigado | validación, sin deserialización insegura |
| A09 Logging/Monitoring Failures | Mitigado | Sentry + logs sin PII |
| A10 SSRF | N/A/Mitigado | solo llamamos a APIs Google fijas; sin fetch de URLs de usuario en server |

---

## 13. Checklist de seguridad pre-deploy (≥20 ítems verificables)

### Autenticación
- [ ] 1. Solo Google OAuth; no existe ruta de login alternativa ni bypass.
- [ ] 2. Cookies de sesión `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] 3. CSRF cubierto (Server Actions same-origin; handlers validan origen).
- [ ] 4. Logout invalida sesión y limpia cookies.
- [ ] 5. Rate limiting activo en auth/callback.

### Autorización
- [ ] 6. `assertMembership` presente en TODA action/handler de datos.
- [ ] 7. RLS habilitada en todas las tablas con `workspace_id`.
- [ ] 8. Test IDOR pasa en tasks, messages, clients (IDs ajenos → 404).
- [ ] 9. Acciones admin verifican `role`.
- [ ] 10. Solo autor edita/borra su mensaje.
- [ ] 11. `parent_id` validado (mismo ws/área, sin ciclos).

### Input/Output
- [ ] 12. Zod valida todos los inputs server-side.
- [ ] 13. Sin `dangerouslySetInnerHTML`; links sanitizados (`http(s)`/`mailto`).
- [ ] 14. Sin `sql.raw` con input interpolado.
- [ ] 15. Rate limiting en mutaciones.

### Datos sensibles
- [ ] 16. PII de clientes no aparece en logs (scrubbing verificado).
- [ ] 17. Tokens Google cifrados AES-256-GCM at rest; descifrado solo server.
- [ ] 18. `.env*` en `.gitignore`; sin secrets en el repo.
- [ ] 19. Sin secrets en client bundle (grep tras build).
- [ ] 20. Export JSON solo admin y no cacheable.

### Headers / Deploy
- [ ] 21. HTTPS forzado; HSTS presente.
- [ ] 22. CSP configurada y probada (sin romper Supabase/Google).
- [ ] 23. `X-Frame-Options: DENY` y `X-Content-Type-Options: nosniff`.
- [ ] 24. `robots.txt` Disallow + meta noindex + `X-Robots-Tag`.
- [ ] 25. DB de producción separada de dev; backups activos.
- [ ] 26. `CRON_SECRET` protege `/api/cron/*`.

**Regla de bloqueo**: ningún deploy a producción con hallazgos Críticos/Altos abiertos (Prompt 6).

---

*Tandem — SECURITY.md.*
