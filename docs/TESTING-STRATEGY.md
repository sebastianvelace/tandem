# Tandem — Estrategia de Testing

> Pirámide de pruebas, stack, cobertura y mapeo a criterios de aceptación CA-01..CA-16.

---

## 1. Pirámide de tests

```
        ▲  E2E (Playwright)        — flujos críticos, pocos, lentos  (~12: E2E-01..12)
       ▲▲  Integration (Vitest)    — Server Actions + DB + RLS + Calendar (MSW)
      ▲▲▲  Unit (Vitest + RTL)     — utilidades, hooks, componentes, Zod, crypto
```
- **Mayoría unit/integration**; E2E reservado a los 12 flujos críticos del Prompt 5.
- DB de test: contenedor Postgres efímero (o proyecto Supabase de test) con migraciones Drizzle aplicadas y RLS activa, para probar aislamiento real.

---

## 2. Stack de testing

| Nivel | Herramienta | Uso |
|---|---|---|
| Unit | **Vitest** | lógica pura, Zod, `crypto.ts`, fractional indexing, helpers i18n/fechas |
| Componente | **Vitest + Testing Library + jsdom** | render, interacción teclado, aria, i18n ES/EN |
| Integración | **Vitest + Postgres efímero + Drizzle** | Server Actions, RLS, reglas de negocio |
| Mock externos | **MSW** | Google Calendar API, Supabase Realtime/Auth en unit/integration |
| E2E | **Playwright** | flujos completos en navegador; OAuth mockeado en CI |
| Cobertura | **Vitest coverage (v8)** | umbrales por módulo |
| Seguridad | tests dedicados (Vitest) | IDOR, auth bypass, XSS en mensajes |

---

## 3. Cobertura mínima por módulo

| Módulo | Líneas | Notas |
|---|---|---|
| `src/server/services/**` (dominio) | **90%** | corazón de la lógica |
| `src/server/actions/**` | **85%** | authz + validación |
| `src/server/auth/**`, `src/lib/crypto.ts` | **95%** | seguridad crítica |
| `src/server/calendar/**` | **85%** | sync con MSW |
| `src/components/**` | **70%** | foco en interacción y estados |
| `src/lib/zod/**` | **100%** | esquemas |
| Global | **≥ 80%** | gate de CI |

PR que baje cobertura global por debajo del umbral → falla CI.

---

## 4. Test plan mapeado a CA-01..CA-16

| CA | Criterio | Nivel | Test(s) |
|---|---|---|---|
| CA-01 | Login Google 2 usuarios | E2E + integration | E2E-01; bootstrap workspace + membership |
| CA-02 | Áreas con chat y tablero scoped | integration + E2E | mensajes/tasks filtrados por `area_id`; E2E-02 |
| CA-03 | Filtrar tablero por cliente en área | integration + E2E | query con `client_id`; E2E-07 |
| CA-04 | Mensajes: enviar/editar/borrar/hilos/tiempo real | integration + E2E | CRUD mensajes; A→B realtime; E2E-02/03 |
| CA-05 | Crear tarea manual y desde mensaje | integration + E2E | action create; `source_message_id`; E2E-04 |
| CA-06 | Drag&drop 3 estados | E2E | E2E-05 (status + position) |
| CA-07 | Subtareas anidadas (≥3 niveles UI) | integration + component + E2E | CTE recursiva; render 3 niveles; E2E-06 |
| CA-08 | Prioridad, responsable opcional, fecha opcional | integration | defaults + nullables |
| CA-09 | CRUD clientes todos los campos | integration | E2E-08 |
| CA-10 | Ficha cliente tareas multi-área | integration + E2E | agrupación por área; E2E-08 |
| CA-11 | Vista calendario interna | component + E2E | render por fecha/prioridad; E2E-09 |
| CA-12 | Sync Tandem → Google Calendar | integration (MSW) | crear/actualizar/borrar evento |
| CA-13 | Archivo auto 7d + manual + restaurar | integration + E2E | cron archiva; restaurar; E2E-10 |
| CA-14 | Notificaciones in-app | integration + component | eventos crean notif; marcar leídas |
| CA-15 | UI dark, ES+EN | component + E2E | sin toggle claro; E2E-11 cambio idioma |
| CA-16 | Deploy accesible solo autenticados | E2E + smoke | E2E-12 redirect login; headers/robots |

> Regla QA: **no marcar un CA como ✅ sin un test que lo demuestre** (Prompt 5).

---

## 5. E2E obligatorios (Playwright)

| ID | Flujo |
|---|---|
| E2E-01 | Login Google (mock) → dashboard del área General |
| E2E-02 | Enviar mensaje en Marketing → aparece en chat |
| E2E-03 | Responder en hilo → contador "N respuestas" incrementa |
| E2E-04 | Convertir mensaje → tarea aparece en tablero |
| E2E-05 | Drag tarea Por hacer → En proceso (persiste) |
| E2E-06 | Crear subtarea → completar → progreso "X/Y" actualiza |
| E2E-07 | Filtrar tablero por cliente |
| E2E-08 | CRUD cliente + ver tareas vinculadas en ficha |
| E2E-09 | Tarea con fecha → aparece en vista calendario |
| E2E-10 | Completar tarea → archivar manual → restaurar |
| E2E-11 | Cambiar idioma ES → EN → UI traducida |
| E2E-12 | Usuario no autenticado → redirect a login |

**OAuth en CI**: se mockea el callback de Supabase Auth (sesión inyectada mediante storage state / endpoint de test que solo existe en `NODE_ENV=test`). No se llama a Google real en CI.

---

## 6. Tests de regresión para flujos críticos

| Flujo | Qué se fija |
|---|---|
| Login OAuth | bootstrap idempotente (no duplica workspace/áreas); refresh_token guardado cifrado |
| Chat tiempo real | mensaje A→B; editar/borrar se propaga; orden cronológico |
| Drag & drop tablero | status correcto; `position` sin colisión; cambio se ve en otra sesión |
| Subtareas recursivas | conteo recursivo; anti-ciclo; herencia de área |
| Sync calendario | crear→evento, cambiar fecha→update, quitar fecha/borrar→delete; fallback responsable→creador; token expirado→refresh |
| Archivo auto (7 días) + restaurar | cron archiva solo `completada` con `completed_at>7d`; restaurar pone `archived_at=null` |

Cada bug corregido añade un test de regresión que lo reproduce (regla QA).

---

## 7. Tests de seguridad (con Prompt 6)

- **IDOR**: usuario del workspace A intenta leer/editar task/message/client de B → 404; vía API directa y vía Server Action.
- **Auth bypass**: acceso a ruta privada sin sesión → redirect; action sin sesión → error.
- **RLS**: query con anon key de A no devuelve filas de B.
- **XSS**: mensaje con `<script>` y `javascript:` URL → renderizado escapado / link sanitizado.
- **Rol**: `member` intenta acción admin (invitar/eliminar área/export) → denegado.

---

## 8. Fixtures / seed

`tests/fixtures/seed.ts` crea un estado determinista:
- 1 workspace "Tandem Test", áreas default (General, Marketing, Desarrollo, SAC).
- 2 usuarios: `admin@test` (admin) y `cofounder@test` (member).
- 2 clientes (Acme Corp activo, Beta Inc inactivo).
- Tareas con subtareas (3 niveles), 1 con `due_date`, 1 completada hace 8 días (para cron), 1 archivada.
- Mensajes con un hilo en Marketing.

Helpers: `withTestDb()` (migra + seed + truncate entre tests), `asUser(userId)` para ejecutar actions con sesión simulada, `mockGoogleCalendar()` (MSW handlers).

---

## 9. CI pipeline (qué corre en cada PR)

```
PR:
  1. install (cache)
  2. lint (eslint) + typecheck (tsc --noEmit)
  3. unit + component (vitest)
  4. integration (vitest + Postgres efímero + migraciones + RLS)
  5. security tests (IDOR/XSS/auth)
  6. build (next build)
  7. npm audit / dependency check
  8. E2E (Playwright) — smoke en PR, suite completa obligatoria en merge a main
  9. coverage gate (≥80% global, umbrales por módulo)
main (post-merge):
  - E2E completo + deploy preview verificado
```
Detalle del workflow en `DEPLOY.md` / Prompt 7. Bugs críticos bloquean merge.

---

*Tandem — TESTING-STRATEGY.md.*
