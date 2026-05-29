# Tandem — Especificación de API

> Tandem usa **Next.js Server Actions** como API principal (mutaciones y lecturas server-side), **Route Handlers** para OAuth/cron/export, y **Supabase Realtime** para eventos en vivo. Esta spec documenta los tres.

---

## 1. Convenciones

- **Auth**: toda action/handler de datos ejecuta `assertMembership(workspaceId, userId)` antes de nada. El `workspace_id` se deriva de la sesión + membership, **no** se confía en el del cliente.
- **Validación**: body validado con **Zod** (esquemas en `src/lib/zod/`).
- **Formato de retorno (Server Actions)**:
  ```ts
  type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: ErrorCode; message: string; fields?: Record<string,string> } }
  ```
- **Route Handlers** devuelven JSON con códigos HTTP estándar.
- Fechas en **ISO 8601 UTC**; el cliente localiza (I18N-05).

### 1.1 Códigos de error estándar
| code | HTTP equiv. | Significado |
|---|---|---|
| `UNAUTHENTICATED` | 401 | sin sesión |
| `FORBIDDEN` | 403 | sesión válida, sin permiso (rol/propiedad) |
| `NOT_FOUND` | 404 | recurso inexistente o de otro workspace (anti-IDOR) |
| `VALIDATION` | 422 | body inválido (`fields` detalla) |
| `CONFLICT` | 409 | nombre de área duplicado, ciclo en subtarea |
| `RATE_LIMITED` | 429 | límite excedido |
| `CALENDAR_NOT_CONNECTED` | 409 | due_date sin calendario conectado |
| `INTERNAL` | 500 | error inesperado |

---

## 2. Server Actions por dominio

### 2.1 Workspace & miembros
| Action | Input (Zod) | Output | Auth | Notas |
|---|---|---|---|---|
| `getCurrentWorkspace()` | — | `{ workspace, role, members }` | member | deriva de sesión |
| `updateWorkspaceName({ name })` | `name: 1..80` | `Workspace` | admin | WS-02 |
| `inviteMember({ email, role })` | `email`, `role∈{admin,member}` | `Invitation` | admin | WS-04 |
| `acceptInvitation({ token })` | `token` | `Membership` | autenticado | valida `expires_at` |
| `listMembers()` | — | `Member[]` | member | WS-03 |

### 2.2 Áreas
| Action | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `listAreas()` | — | `Area[]` (con badge no-leídos) | member | AREA-01, AREA-08 |
| `createArea({ name, color?, icon? })` | `name:1..40` único | `Area` | member | AREA-02/03; `CONFLICT` si duplicado |
| `updateArea({ id, name?, color?, icon?, position? })` | parcial | `Area` | admin/creador | AREA-09/10 |
| `deleteArea({ id, taskDestination })` | `taskDestination∈{move_to_general,delete}` | `{ ok }` | admin/creador | AREA-09 confirma destino |

### 2.3 Mensajes & hilos
| Action | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `listMessages({ areaId, cursor?, limit? })` | `limit≤50` | `{ messages, nextCursor }` | member | MSG-04 scroll infinito |
| `sendMessage({ areaId, body, parentMessageId? })` | `body:1..4000` | `Message` | member | MSG-01/08, TH-01; emite `message.created` |
| `editMessage({ id, body })` | `body:1..4000` | `Message` | autor | MSG-05; set `edited_at`; emite `message.updated` |
| `deleteMessage({ id })` | `id` | `{ ok }` | autor | MSG-06 soft delete; emite `message.deleted` |
| `listThread({ parentMessageId })` | — | `Message[]` | member | TH-02 |
| `getThreadCount({ parentMessageId })` | — | `{ count }` | member | TH-03 |

### 2.4 Tareas
| Action | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `listBoardTasks({ areaId, filters })` | `filters:{clientId?, assigneeId?\|'unassigned', priorities?[], q?}` | `Task[]` (solo raíz, no archivadas) | member | BRD-01..07, TASK-08 |
| `listAreaTasksList({ areaId, sort, filters })` | sort por columna | `Task[]` | member | LIST-01..04 |
| `getTask({ id })` | — | `Task & { subtasks, sourceMessage? }` | member | TASK-06 |
| `createTask(input)` | ver §2.4.1 | `Task` | member | TASK-01; emite `task.created`; sync calendar si `dueDate` |
| `updateTask({ id, ...patch })` | parcial validado | `Task` | member | TASK-01; sync calendar si cambia `dueDate`; emite `task.updated` |
| `moveTask({ id, status, position })` | `status` enum, `position:number` | `Task` | member | TASK-03/04; emite `task.moved` |
| `deleteTask({ id })` | — | `{ ok }` | member | confirma cliente; borra evento calendar; emite `task.deleted` |
| `createSubtask({ parentId, title, ...})` | hereda `area_id` raíz | `Task` | member | SUB-01/02/09; valida ws/área + anti-ciclo |
| `getSubtaskProgress({ id })` | — | `{ completed, total }` (recursivo) | member | SUB-06 |
| `createTaskFromMessage({ messageId, title?, clientId? })` | — | `Task` | member | MSG-09..12; set `source_message_id` |
| `setTaskStatus({ id, status })` | enum | `Task` | member | LIST-05; si `completada` set `completed_at` |

#### 2.4.1 Schema `createTask`
```ts
const createTaskSchema = z.object({
  areaId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).optional(),
  clientId: z.string().uuid().nullable().optional(),
  status: z.enum(['por_hacer','en_proceso','completada']).default('por_hacer'),
  priority: z.enum(['alta','media','baja']).default('media'),
  assigneeUserId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sourceMessageId: z.string().uuid().nullable().optional(),
})
```
Server valida: `areaId`/`clientId`/`assigneeUserId`/`parentId` pertenecen al workspace; si `parentId`, hereda `area_id` de la raíz y verifica no-ciclo.

### 2.5 Clientes
| Action | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `listClients({ includeInactive? })` | bool | `Client[]` | member | CLI-05/11 |
| `getClient({ id })` | — | `Client & { tasksByArea }` | member | CLI-06/09 |
| `createClient(input)` | `name:1..120` req, resto opc. | `Client` | member | CLI-01/02 |
| `updateClient({ id, ...patch })` | parcial | `Client` | member | CLI-01 |
| `deleteClient({ id })` | — | `{ ok }` | member | confirma; tareas quedan con `client_id=null` |

### 2.6 Calendario
| Action / Handler | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `GET /api/calendar/connect` (Route) | OAuth redirect | redirect | autenticado | CAL-05; guarda tokens cifrados |
| `disconnectCalendar()` | — | `{ ok }` | self | borra `calendar_connections` |
| `getCalendarStatus()` | — | `{ connected, googleEmail? }` | self | UI settings |
| `listCalendarTasks({ areaId?, from, to })` | rango | `Task[]` con `due_date` | member | CAL-01/02 vista interna |
| _(interno)_ `syncTaskToCalendar(task)` | — | `CalendarEventLink` | sistema | CAL-06/07/08; side-effect de create/update/delete task |

Reglas sync (CAL-06): destino = calendario del **responsable** si conectado; si sin responsable → **creador**; si nadie conectado y hay `dueDate` → `CALENDAR_NOT_CONNECTED` (no bloquea guardar la tarea; se marca `sync_state` y se avisa).

### 2.7 Archivo
| Action | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `listArchived({ filters })` | `{areaId?, clientId?, assigneeId?, q?}` | `Task[]` | member | ARC-03/04 |
| `archiveTask({ id })` | — | `Task` | member | ARC-02 set `archived_at` |
| `restoreTask({ id })` | — | `Task` | member | ARC-05 `archived_at=null` |
| `deletePermanently({ id })` | — | `{ ok }` | member | ARC-06 confirma |

### 2.8 Notificaciones
| Action | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `listNotifications({ unreadOnly? })` | bool | `Notification[]` | self | NOT-01/02 |
| `markRead({ id })` | — | `{ ok }` | self | NOT-04 |
| `markAllRead()` | — | `{ ok }` | self | NOT-04 |

### 2.9 Perfil & export
| Action / Handler | Input | Output | Auth | Reqs |
|---|---|---|---|---|
| `updateLocale({ locale })` | `'es'\|'en'` | `User` | self | AUTH-03/I18N-03 |
| `GET /api/export` (Route) | — | JSON adjunto | admin | SEC-04; no cacheable |

---

## 3. Route Handlers (no Server Action)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/auth/callback` | público (code OAuth) | intercambia code→sesión, upsert user, bootstrap workspace, guarda tokens cifrados |
| GET | `/api/calendar/connect` | sesión | inicia OAuth de Calendar (re-consent si falta scope) |
| POST | `/api/cron/auto-archive` | `CRON_SECRET` header | archiva tareas `completada` con `completed_at < now()-7d` (ARC-01) |
| GET | `/api/export` | admin | export workspace JSON |

**`/api/cron/auto-archive`**: header `Authorization: Bearer ${CRON_SECRET}`; responde `{ archived: n }`. Sin header válido → 401.

---

## 4. Eventos Realtime (Supabase)

Canal: `ws:{workspace_id}:area:{area_id}` (chat/tablero), `user:{user_id}` (notificaciones). RLS aplica a las suscripciones.

| Evento | Origen (tabla) | Payload | Consumidor |
|---|---|---|---|
| `message.created` | INSERT messages | `{ id, areaId, parentMessageId, authorUserId, body, createdAt }` | chat, contador hilo |
| `message.updated` | UPDATE messages | `{ id, body, editedAt }` | chat (muestra "(editado)") |
| `message.deleted` | UPDATE (deleted_at) | `{ id }` | chat ("[mensaje eliminado]") |
| `thread.reply.created` | INSERT messages (parent≠null) | `{ parentMessageId, count }` | contador "N respuestas" |
| `task.created` | INSERT tasks | `{ id, areaId, status, ... }` | tablero, lista |
| `task.updated` | UPDATE tasks | `{ id, ...changed }` | tablero, detalle |
| `task.moved` | UPDATE tasks (status/position) | `{ id, status, position }` | tablero |
| `task.deleted` | DELETE tasks | `{ id }` | tablero |
| `notification.created` | INSERT notifications | `{ id, type, entityType, entityId }` | campana |

Reglas: el cliente solo recibe eventos de áreas/workspace a los que pertenece (RLS); reconexión automática (`supabase-js`); optimistic UI en `sendMessage` y `moveTask` con reconciliación al recibir el evento confirmado.

---

## 5. Paginación y orden

- Mensajes: cursor por `created_at` descendente, `limit≤50`, scroll infinito hacia arriba (MSG-04).
- Tablero: orden `status, position`; lista: orden por header (LIST-04).
- Archivo/notificaciones: por `archived_at`/`created_at` desc, paginado.

---

*Tandem — API-SPEC.md. Se actualiza si un agente cambia un contrato (regla Prompt 1).*
