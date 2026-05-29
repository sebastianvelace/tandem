# Tandem

Centro de control interno para los dos cofundadores de una agencia de IA/automatización: **chat por áreas + tablero Kanban + clientes + calendario**, con Google OAuth. Español-primario, bilingüe ES/EN, dark mode, desktop-first.

Deploy objetivo: `tandem.integrascale.online`.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript strict** (`noUncheckedIndexedAccess`)
- **Supabase** (Postgres 15/16 · Auth con Google OAuth · Realtime · RLS)
- **Drizzle ORM** + drizzle-kit (migraciones)
- **Tailwind CSS v4** (tema dark único) · shadcn/ui (Radix) · **dnd-kit** (drag&drop)
- **next-intl** sin routing por URL (idioma por usuario en cookie) · **Zod** · **googleapis**

Seguridad (ADR-004): RLS **solo-SELECT** para el rol `authenticated` (navegador/Realtime); **todas las escrituras pasan por Server Actions** con `assertMembership` sobre la conexión de servicio.

## Estado del MVP — 5 sprints implementados ✅

Todo el código que **no** depende de credenciales está implementado y verificado (`typecheck` + `build` + `db:migrate` + pruebas funcionales SQL de RLS/cascada/auto-archivado). Lo único pendiente son verificaciones en vivo y el deploy → ver **[`docs/PENDIENTES-CREDENCIALES.md`](docs/PENDIENTES-CREDENCIALES.md)**.

| Sprint | Alcance | Estado | Reporte |
|---|---|---|---|
| **1 — Fundación** | Auth Google + workspace + 4 áreas + shell + i18n + **schema (11 tablas) + RLS** | ✅ Completo | [sprint-1](docs/reports/sprint-1-backend.md) |
| **2 — Chat** | Mensajería por área en tiempo real, hilos, mensaje→tarea | ✅ Completo¹ | [sprint-2](docs/reports/sprint-2-chat.md) |
| **3 — Tareas + Tablero** | CRUD, Kanban drag&drop (fractional), subtareas (3 niveles), filtros, vista lista | ✅ Completo¹ | [sprint-3](docs/reports/sprint-3-tablero.md) |
| **4 — Clientes / Calendario / Archivo** | Clientes CRUD + ficha, calendario interno, **sync Google**², archivo auto+manual+restaurar + cron | ✅ Completo¹ | [sprint-4](docs/reports/sprint-4-clientes-calendario-archivo.md) |
| **5 — Pulido + Deploy** | Notificaciones in-app realtime, búsqueda, atajos, export JSON | ✅ Completo¹ ³ | [sprint-5](docs/reports/sprint-5-pulido.md) |

¹ El **realtime end-to-end** (chat, tablero, notificaciones) está implementado; su verificación visual entre dos sesiones requiere un proyecto Supabase real.
² El **sync con Google Calendar** está codificado y cableado (R2-safe, no-op sin conexión); su prueba end-to-end requiere credenciales de Google.
³ El **deploy (S5-T07)** está bloqueado por entorno. Pasos en el documento de pendientes.

### Funcionalidad disponible

- 🔐 Login con Google · bootstrap de workspace con áreas **General / Marketing / Desarrollo / Servicio al cliente** · invitar cofundador
- 💬 Chat por área en tiempo real · hilos · editar/borrar · enlaces clicables · **convertir mensaje → tarea**
- 📋 Tablero Kanban (Por hacer / En proceso / Completada) con drag&drop · vista lista · filtros (prioridad/responsable/cliente) · creación rápida
- 🌳 Subtareas (misma entidad, 3 niveles en UI / infinitas en datos) con progreso recursivo y auto-completar sugerido
- 👥 Clientes: directorio, ficha con tareas por área, activo/inactivo
- 🗓️ Calendario interno (mes) + **sync unidireccional Tandem → Google Calendar**
- 🗄️ Archivo: auto-archivado (cron 7 días) + manual + restaurar + eliminar permanente
- 🔔 Notificaciones in-app (campana + badge, realtime) · 📤 export del workspace a JSON (admin)
- 🌓 Dark mode único · 🌐 ES/EN por usuario · ⌨️ atajos (`N` nueva tarea, `Esc` cerrar, `/` buscar)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env        # rellenar Supabase + Google + secretos (ver abajo)
pnpm db:migrate             # requiere DIRECT_URL (aplica las 5 migraciones)
pnpm dev                    # http://localhost:3000
```

> Sin `.env` real, el código compila y construye (`pnpm typecheck && pnpm build`): la conexión a BD es perezosa y el sync de calendario hace no-op. Para usar la app con datos hace falta el entorno (ver **[`docs/PENDIENTES-CREDENCIALES.md`](docs/PENDIENTES-CREDENCIALES.md)** §A y **[`docs/DEPLOY.md`](docs/DEPLOY.md)**).

### Scripts

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build de producción / arranque |
| `pnpm typecheck` | `tsc --noEmit` (TS strict) |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Migraciones Drizzle |
| `pnpm test` / `test:e2e` | Vitest / Playwright (suite pendiente — ver pendientes §C) |

### Variables de entorno

Plantilla en `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooled), `DIRECT_URL` (no pooled), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY` (32 bytes), `CRON_SECRET`.

## Documentación

| Documento | Contenido |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Stack, modelo de datos (11 tablas), 10 ADRs, RLS, i18n, estructura |
| [IMPLEMENTATION-PLAN](docs/IMPLEMENTATION-PLAN.md) | Plan por sprints (tareas `S{n}-T{nn}`), riesgos, DoD |
| [API-SPEC](docs/API-SPEC.md) · [SECURITY](docs/SECURITY.md) · [TESTING-STRATEGY](docs/TESTING-STRATEGY.md) | Contratos, seguridad, estrategia de tests |
| [DEPLOY](docs/DEPLOY.md) · [AGENT-PROMPTS](docs/AGENT-PROMPTS.md) | Despliegue · prompts de agentes |
| **[PENDIENTES-CREDENCIALES](docs/PENDIENTES-CREDENCIALES.md)** | **Lo que falta: qué haces tú vs. qué se ejecuta después** |
| [reports/](docs/reports/) | Reporte de cada sprint con verificación ejecutada |

## Estructura

```
src/
  app/(app)/        rutas autenticadas: areas/[areaId], clients, calendar, archive, settings
  app/(auth)/       login + callback OAuth
  app/api/cron/     auto-archivado (protegido por CRON_SECRET)
  components/       chat · board · client · calendar · archive · notifications · settings · ui
  server/
    actions/        Server Actions (capa de escritura, validan authz + Zod)
    services/       lógica de dominio sobre Drizzle
    calendar/       conexión cifrada + sync Google (R2-safe)
    auth/           authz (assertMembership), errores, sesión
  hooks/            realtime (useAreaMessages/useThreadReplies/useAreaTasks/useNotifications)
  lib/              zod · board · chat · crypto · hotkeys · i18n · env
  db/               schema Drizzle + cliente perezoso
drizzle/            migraciones (0000 schema, 0001 RLS, 0002-0004 realtime)
```
