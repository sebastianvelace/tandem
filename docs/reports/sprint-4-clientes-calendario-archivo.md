# Reporte — Sprint 4 (Clientes + Calendario + Archivo)

> Tech lead. Directorio de clientes, vista calendario interna, sync unidireccional Google Calendar y archivo (auto+manual+restaurar), según IMPLEMENTATION-PLAN §Sprint 4.

## Qué se implementó

| Tarea | Estado | Entregable |
|---|---|---|
| S4-T01 | ✅ | Clientes CRUD completo (service/actions/Zod) + UI (`ClientDirectory`/`ClientForm`); activo/inactivo oculta en selectores (`listActiveClients` ya filtra) |
| S4-T02 | ✅ | Vincular cliente a tarea (selector en `TaskDetail`) + **filtro de cliente del tablero ya funcional** (BoardFilters consume `listActiveClients`) |
| S4-T03 | ✅ | Ficha cliente (`ClientDetail`): datos + tareas vinculadas de **todas las áreas agrupadas por área** (CLI-06/08/09) |
| S4-T04 | ✅ (código) | `calendar_connections`: conectar/desconectar, **tokens cifrados AES-256-GCM** (`lib/crypto.ts`), refresh on-demand vía OAuth2 client (`server/calendar/connection.ts`) |
| S4-T05 | ✅ (código) | Sync unidireccional como **side-effect síncrono** al guardar tarea (`server/calendar/sync.ts`): crear/actualizar/eliminar evento; tolerante a fallos (R2) |
| S4-T06 | ✅ (código) | Selección de calendario destino: responsable si conectado, si no el creador; sin nadie conectado → no-op (CAL-06) |
| S4-T07 | ✅ | Vista calendario interna (`CalendarView`): rejilla mensual, color por prioridad, clic navega al área (CAL-01..04) |
| S4-T08 | ✅ | Archivo: **auto-archivar** (cron `/api/cron/auto-archive`, 7 días) + manual (botón en detalle) + restaurar + eliminar permanente (ARC-01..07) |
| S4-T09 | ✅ | Vista Archivo global (`ArchiveView`) con filtros área/cliente/responsable/título (ARC-03/04) |

## Verificación (ejecutada)

- ✅ `pnpm typecheck` — sin errores (TS strict).
- ✅ `pnpm build` — compila; nuevas rutas: `/clients`, `/clients/[id]`, `/archive`, `/calendar`, `/api/cron/auto-archive`.
- ✅ `pnpm db:migrate` (Postgres 16 efímero) — sin migración nueva (S4 no cambia schema; usa tablas/índices ya creados en S1).
- ✅ **Lógica de auto-archivado validada funcionalmente**: tarea raíz completada hace >7 días → **archivada**; completada reciente, subtarea (parent_id no nulo) y `por_hacer` → **no archivadas**. Usa el índice parcial `idx_tasks_autoarchive`.

## Decisiones tomadas

- **Sync reutiliza los provider tokens de Supabase**: el login ya pide scope `calendar.events` + `access_type=offline` + `prompt=consent`; "conectar calendario" guarda esos tokens cifrados, evitando un segundo flujo OAuth. Si falta el `refresh_token` (R1), pide reconectar re-logueando.
- **Cifrado AES-256-GCM** (SEC-06): blob `iv||tag||ciphertext` en columna `bytea`; `TOKEN_ENC_KEY` admite hex(64)/base64/prefijos `hex:`/`base64:`.
- **Sync síncrono y tolerante** (ADR-007/R2): se llama en `createTask`/`updateTask`/`deleteTask`; ante error marca `sync_state='error'` y **no rompe** el guardado. Sin conexión → no-op (no toca credenciales, no falla sin `.env`).
- **Auto-archivado solo de raíces**: no auto-archiva subtareas completadas (desaparecerían de su árbol); el cron filtra `parent_id IS NULL`.
- **Cron protegido por `CRON_SECRET`** (header `Authorization: Bearer`), ruta añadida a `PUBLIC_PATHS` del middleware (no usa sesión). Registrado en `vercel.json` (diario 03:00).
- **Calendario interno separado del sync**: la vista mensual solo lee `due_date`; el sync con Google es independiente.

## CA cubiertos

- **CA-09** (CRUD clientes): completo.
- **CA-10** (ficha multi-área): completo.
- **CA-11** (calendario interno): completo.
- **CA-12** (sync Google): **código completo**; verificación end-to-end requiere `.env` con Google OAuth + Supabase (pendiente del entorno).
- **CA-13** (archivo auto+manual+restaurar): completo; auto-archivado validado funcionalmente.

## Blockers / pendientes (requieren credenciales reales)

- **Sync Google end-to-end**: con `.env` real, verificar conectar calendario (provider tokens presentes), crear tarea con fecha → evento en Google, cambiar fecha → update, borrar/archivar → delete. El refresh_token depende del primer consentimiento (R1).
- **Tests MSW del sync**: la suite Vitest + MSW para `sync.ts` (mockeando googleapis) queda pendiente del agente QA (S5/TESTING-STRATEGY §8); el código está aislado y es testeable.
- **Cron en prod**: `vercel.json` registra el cron; en Vercel hay que definir `CRON_SECRET` para que inyecte el header.

## Archivos nuevos/clave

```
src/lib/zod/client.ts                       validación de clientes
src/server/services/clients.ts              CRUD + ficha (tareas por área)
src/server/actions/clients.ts               actions de clientes
src/components/client/*                      ClientDirectory, ClientForm, ClientDetail
src/app/(app)/clients/(page|[id]/page).tsx   directorio + ficha

src/server/services/archive.ts              archivar/restaurar/eliminar + autoArchiveCompleted
src/server/actions/archive.ts               actions de archivo
src/app/api/cron/auto-archive/route.ts      cron protegido con CRON_SECRET
src/components/archive/ArchiveView.tsx       vista global con filtros
src/app/(app)/archive/page.tsx

src/server/services/tasks.ts                 + listScheduledTasks + sync wiring (create/update/delete)
src/components/calendar/CalendarView.tsx     rejilla mensual (solo lectura)
src/app/(app)/calendar/page.tsx

src/lib/crypto.ts                            AES-256-GCM para tokens (SEC-06)
src/server/calendar/connection.ts            conexión cifrada + OAuth2 client + refresh
src/server/calendar/sync.ts                  sync unidireccional Tandem→Google (R2-safe)
src/server/actions/calendar.ts               connect/disconnect/status
src/components/settings/CalendarConnection.tsx  UI en settings
vercel.json                                  cron diario de auto-archivado
```
