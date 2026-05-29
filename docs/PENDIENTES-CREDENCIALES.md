# Pendientes que dependen de credenciales / acciones tuyas

> Este documento separa lo que **tú debes hacer** (montar Supabase, Google Cloud, Vercel, `.env`) de lo que **yo ejecutaré después**, una vez exista el entorno real. El código de cada punto ya está escrito y verificado por `typecheck`/`build`; solo falta probarlo/activarlo en vivo.
>
> Estado: Sprints 1–5 implementados. Falta exclusivamente lo listado aquí.

---

## A. Lo que debes hacer tú (una vez)

1. **Proyecto Supabase**
   - Crear proyecto (Postgres 15/16 + Auth + Realtime).
   - Habilitar **Realtime** y confirmar que existe la publicación `supabase_realtime` (las migraciones `0002`/`0003`/`0004` añaden las tablas; en Supabase la publicación ya existe).
   - Auth → Providers → **Google**: pegar Client ID/Secret, añadir scope `https://www.googleapis.com/auth/calendar.events`.
   - Copiar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooled) y `DIRECT_URL` (no pooled) al `.env`.
2. **Google Cloud Console**
   - Crear OAuth Client (Web), redirect a la URL de callback de Supabase.
   - Pantalla de consentimiento con scopes de Calendar; `access_type=offline` y `prompt=consent` (ya configurados en el login) para recibir `refresh_token` (R1).
   - Copiar `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` al `.env`.
3. **Secretos**
   - `TOKEN_ENC_KEY` = 32 bytes (`openssl rand -base64 32`).
   - `CRON_SECRET` = (`openssl rand -base64 32`).
4. **Migraciones**: con `DIRECT_URL` puesto, `pnpm db:migrate`.
5. **Vercel** (para deploy): proyecto + dominio `tandem.integrascale.online`, todas las env vars, y `CRON_SECRET` definido para que el cron inyecte el header `Authorization`.

---

## B. Lo que yo ejecuto/verifico DESPUÉS (por sprint)

### Sprint 2 — Chat
- [ ] Verificar Realtime de chat end-to-end: A envía → B recibe sin recargar; responder en hilo incrementa el contador en vivo.

### Sprint 3 — Tablero
- [ ] Verificar Realtime/drag end-to-end entre dos sesiones (mover/crear en A se ve en B).
- [ ] (Mejora) Rebalanceo de `position` si colisionan dos posiciones por agotamiento de precisión fractional.

### Sprint 4 — Clientes / Calendario / Archivo
- [ ] **Sync Google Calendar end-to-end** (CA-12): conectar calendario en Ajustes (requiere provider tokens del login con consentimiento) → crear tarea con fecha = evento en Google; cambiar fecha = update; borrar/archivar = delete. Validar fallback responsable→creador y el marcado `sync_state='error'` (R2).
- [ ] **Cron de auto-archivado en prod**: confirmar que Vercel invoca `/api/cron/auto-archive` a diario con el header del `CRON_SECRET`.
- [ ] **Tests MSW del sync** (`server/calendar/sync.ts`) mockeando googleapis — agente QA / TESTING-STRATEGY §8.

### Sprint 5 — Pulido + Deploy
- [ ] **Notificaciones realtime end-to-end** (NOT-04): con dos sesiones, comprobar que asignar una tarea o responder un hilo hace aparecer la notificación en la campana del destinatario sin recargar, y que "marcar leídas" baja el badge.
- [ ] **Deploy en Vercel (S5-T07, CA-16)** — bloqueado por entorno. Lo ejecuto cuando tengas Vercel + dominio + env vars:
  - Conectar el repo `tandem` a Vercel, añadir todas las env vars (incluido `CRON_SECRET`).
  - Apuntar `tandem.integrascale.online` al proyecto.
  - Verificar headers de seguridad, `robots.txt` noindex, acceso solo autenticado y el cron activo.
  - Smoke E2E en el preview.
- [ ] (Mejora opcional) Skeleton loaders y un sistema de toasts global; los empty states, transiciones 150ms y el toast de auto-completar ya están.

---

## C. Pendiente transversal (cualquier momento, lo hace el agente QA)
- [ ] Portar a `tests/integration/` las pruebas SQL ya validadas a mano: aislamiento RLS de `messages`/`tasks`, escritura denegada al rol `authenticated`, cascada de subtareas y semántica del auto-archivado.
- [ ] Suite Vitest + Postgres efímero (TESTING-STRATEGY §8) y E2E Playwright (E2E-01..12).
