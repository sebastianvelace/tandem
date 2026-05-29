# Reporte — Sprint 5 (Pulido + Deploy)

> Tech lead. Notificaciones in-app, búsqueda, atajos, export y verificación de seguridad, según IMPLEMENTATION-PLAN §Sprint 5. El deploy (S5-T07) queda en `docs/PENDIENTES-CREDENCIALES.md` por requerir entorno.

## Qué se implementó

| Tarea | Estado | Entregable |
|---|---|---|
| S5-T01 | ✅ | Notificaciones: campana + badge (`NotificationBell`), lista, marcar leída/todas, **realtime** (`useNotifications` + migración `0004`), navegación al contexto; creación de `task_assigned` al asignar (NOT-01..05) |
| S5-T02 | ✅ | Búsqueda por título: ya en tablero y archivo; añadida en directorio de clientes; atajo `/` enfoca la búsqueda del tablero |
| S5-T03 | ✅ | Atajos de teclado (`src/lib/hotkeys.ts`): `N` nueva tarea (abre alta rápida en Por hacer), `Esc` cierra el panel de detalle, `/` búsqueda (UX-10) |
| S5-T04 | ◑ | Empty states en todas las vistas, transiciones 150ms y toast de auto-completar presentes. Skeleton loaders + sistema de toasts global quedan como mejora opcional |
| S5-T05 | ✅ | Export workspace a JSON (admin): `exportWorkspace` (sin tokens ni notificaciones), action con `assertAdmin`, botón con descarga (SEC-04) |
| S5-T06 | ✅ | `robots.txt` noindex + headers CSP/HSTS/X-Frame/etc. ya presentes desde S1 (`next.config.ts`, `public/robots.txt`); verificado |
| S5-T07 | ⏳ | Deploy en `tandem.integrascale.online` — **bloqueado por entorno**; pasos en PENDIENTES-CREDENCIALES §B Sprint 5 |

## Verificación (ejecutada)

- ✅ `pnpm typecheck` — sin errores.
- ✅ `pnpm build` — todas las rutas compilan (campana integrada en el header global).
- ✅ `pnpm db:migrate` (Postgres 16 efímero) — las **5** migraciones aplican; la publicación `supabase_realtime` contiene `messages, notifications, tasks`; `notifications` con `REPLICA IDENTITY FULL` y RLS **solo-SELECT** (las notificaciones se crean por la conexión de servicio, nunca por el cliente).

## Decisiones tomadas

- **Notificaciones: refetch en evento** en vez de aplicar el payload Realtime. Con 2 usuarios y bajo volumen, al recibir cualquier cambio se recarga la lista (más simple y robusto que reconciliar el payload snake_case). El badge es optimista en marcar-leída.
- **RLS de notificaciones solo-SELECT del destinatario**: el cliente solo lee las suyas (ya en S1); se crean vía service role tras la acción que las origina (thread_reply en S2, task_assigned aquí).
- **`task_assigned`** se emite en `createTask`/`updateTask` cuando el responsable cambia y no es el propio actor (evita auto-notificarse). Payload incluye `areaId` para que la campana navegue al contexto.
- **Atajos contextuales al tablero**: `useHotkeys` ignora pulsaciones mientras se escribe (salvo `Esc`). `N` emite una señal que abre el alta rápida de la columna "Por hacer".
- **Export sin datos sensibles** (SEC-04): incluye workspace, miembros, áreas, clientes, tareas y mensajes; **excluye** tokens de calendario y notificaciones.

## CA cubiertos

- **CA-14** (notificaciones): completo en código; verificación realtime e2e entre 2 sesiones requiere `.env` (pendiente).
- **CA-15** (dark + ES/EN): completo.
- **CA-16** (deploy solo autenticados): el gate, headers y noindex están; el deploy en sí es S5-T07 (pendiente de entorno).

## Pendientes (en `docs/PENDIENTES-CREDENCIALES.md`)

- Verificación realtime de notificaciones entre dos sesiones.
- **Deploy completo en Vercel** (S5-T07): conectar repo, env vars + `CRON_SECRET`, dominio, smoke E2E, cron activo.
- Mejora opcional: skeleton loaders + toasts global.

## Archivos nuevos/clave

```
drizzle/0004_realtime_notifications.sql      publicación + REPLICA IDENTITY para notifications
src/server/services/notifications.ts         + list/unreadCount/markRead/markAllRead
src/server/actions/notifications.ts          actions de la campana
src/hooks/useNotifications.ts                 realtime + estado de la campana
src/components/notifications/NotificationBell.tsx
src/components/header/Header.tsx              integra la campana (reemplaza placeholder)
src/server/services/tasks.ts                  + notificación task_assigned (create/update)
src/lib/hotkeys.ts                            useHotkeys (N / Esc / /)
src/components/board/{BoardClient,Board,Column}.tsx  atajos + señal de alta rápida
src/components/client/ClientDirectory.tsx     búsqueda de clientes
src/server/services/export.ts                 export del workspace a JSON
src/server/actions/export.ts                  action (assertAdmin)
src/components/settings/ExportWorkspace.tsx   botón de descarga
docs/PENDIENTES-CREDENCIALES.md               consolida lo que depende de tus credenciales
```
