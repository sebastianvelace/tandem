# Tandem — Plan de Implementación

> Plan por sprints derivado de `IDEA-PROYECTO.md` §10 y `ARCHITECTURE.md`. Stack: Next.js 15 + Supabase + Drizzle + next-intl.
> IDs de tarea: `S{sprint}-T{nn}`. Cada tarea incluye archivos, dependencias, criterio de done y tests.

---

## 0. Orden global de construcción y por qué

1. **Fundación primero (S1)**: sin auth + workspace + shell + i18n + áreas no hay dónde colgar nada. El modelo de datos y RLS se montan aquí completos (todas las tablas), aunque algunas se exploten en sprints posteriores — evita migraciones disruptivas.
2. **Chat (S2)** antes que tareas: el spec liga "mensaje → tarea" (MSG-09); tener chat real-time funcionando da el patrón Realtime reutilizable para el tablero.
3. **Tareas + Tablero (S3)**: el núcleo del producto; reutiliza Realtime de S2 y consume "crear tarea desde mensaje".
4. **Clientes + Calendario + Archivo (S4)**: clientes habilitan el filtro del tablero (ya preparado en S3) y la ficha; calendario depende de `due_date` de tareas; archivo depende de `completed_at`.
5. **Pulido (S5)**: notificaciones, búsqueda, animaciones, deploy y export — transversal, va al final.

**Regla**: el modelo de datos completo y las RLS se crean en **S1-T03** para no re-migrar; las features posteriores solo añaden lógica, no tablas nuevas (salvo ajustes menores).

---

## Sprint 1 — Fundación

**Objetivo**: usuario entra con Google, existe workspace con áreas predefinidas, shell dark con sidebar e i18n.

| ID | Descripción | Archivos | Dependencias | Done | Tests |
|---|---|---|---|---|---|
| S1-T01 | Scaffold Next.js 15 + TS strict + Tailwind v4 + shadcn/ui + fuentes (General Sans/Clash Display) | `package.json`, `src/app/layout.tsx`, `tailwind.config`, `src/app/globals.css` | — | App arranca, tema dark aplicado sin flash | Smoke: home renderiza |
| S1-T02 | Config Supabase clients (browser/server) + Drizzle + `drizzle.config.ts` + conexión | `src/lib/supabase/*`, `src/db/client.ts`, `drizzle.config.ts`, `.env.example` | T01 | `drizzle-kit` conecta; clients tipados | Unit: client factory |
| S1-T03 | **Schema completo** Drizzle (11 tablas, enums, índices) + migración inicial + **RLS policies** | `src/db/schema.ts`, `drizzle/0000_init.sql` | T02 | Migración aplica; RLS activa en todas las tablas | Integration: RLS bloquea cross-workspace |
| S1-T04 | i18n next-intl: provider, `messages/es.json`+`en.json`, helper de fechas | `src/i18n/*`, `messages/*`, `src/app/layout.tsx` | T01 | UI conmuta ES/EN; fecha localizada | Unit: formateo fecha ES/EN |
| S1-T05 | Auth: `signInWithOAuth` Google + scopes Calendar, callback, upsert user, `middleware.ts` gate | `src/app/(auth)/login/page.tsx`, `auth/callback/route.ts`, `src/middleware.ts`, `src/server/auth/*` | T03 | Login real redirige a `/areas/general`; rutas protegidas | Integration: ruta privada sin sesión → 302 login |
| S1-T06 | Bootstrap workspace: primer usuario crea workspace + 4 áreas default + membership admin | `src/server/services/workspace.ts`, `auth/callback/route.ts` | T05 | Tras 1er login existen General/Marketing/Desarrollo/SAC | Integration: bootstrap idempotente |
| S1-T07 | Invitación cofounder (crear + aceptar) | `src/server/actions/invitations.ts`, `settings/workspace/page.tsx` | T06 | Admin invita; invitado entra al mismo workspace | Integration: token válido/expirado |
| S1-T08 | Shell desktop: sidebar (áreas, clientes, calendario, archivo) + header (avatar, idioma) | `src/app/(app)/layout.tsx`, `src/components/sidebar/*`, `src/components/ui/*` | T04,T06 | Layout §6.6 del spec; navegación funciona | Component: sidebar lista áreas |
| S1-T09 | Áreas CRUD (crear, renombrar único, editar color/icono, eliminar con destino de tareas) | `src/server/actions/areas.ts`, `src/components/sidebar/AreaItem.tsx` | T03,T08 | AREA-01..03,09,10; nombre único enforced | Integration: nombre duplicado rechazado; eliminar mueve tareas a General |
| S1-T10 | `assertMembership` + helpers authz reutilizables | `src/server/auth/authz.ts` | T05 | Toda action lo usa | Unit: deniega no-miembro |

**Criterios de aceptación cubiertos**: CA-01 (login 2 usuarios), CA-15 (parcial: dark + ES/EN), CA-16 (parcial: acceso autenticado).

---

## Sprint 2 — Chat

**Objetivo**: mensajería por área en tiempo real, hilos, y conversión mensaje → tarea.

| ID | Descripción | Archivos | Dependencias | Done | Tests |
|---|---|---|---|---|---|
| S2-T01 | Service + actions de mensajes (enviar, editar, borrar soft, listar paginado) | `src/server/actions/messages.ts`, `src/server/services/messages.ts` | S1 | MSG-01..06,08; scoped a `area_id` | Integration: CRUD + scope workspace |
| S2-T02 | Realtime chat: suscripción Postgres Changes en `messages` por área + optimistic UI | `src/server/realtime/*`, `src/components/chat/ChatPanel.tsx`, hook `useAreaMessages` | T01 | MSG-07; mensaje del otro aparece sin recargar | Integration: A envía → B recibe |
| S2-T03 | UI chat: input (Enter/Shift+Enter), burbujas agrupadas, timestamp/autor, links clicables, "(editado)"/"[eliminado]" | `src/components/chat/*` | T02 | MSG-01..06; estética Slack | Component: render + edición |
| S2-T04 | Hilos: responder en hilo, panel lateral derecho, contador "N respuestas" | `src/components/chat/ThreadPanel.tsx`, service hilos | T03 | TH-01,02,03 | Integration: reply incrementa contador; Component: panel |
| S2-T05 | Notificación de respuesta en hilo (escribe en `notifications`) | `src/server/services/notifications.ts` (base) | T04 | TH-04 (registro creado) | Integration: reply notifica autor padre |
| S2-T06 | Convertir mensaje → tarea: modal pre-rellenado (título ~80c, descripción completa), hereda área, selector cliente; enlace bidireccional | `src/components/chat/CreateTaskFromMessage.tsx`, actions | T03 (+ stub task service) | MSG-09..12 | Integration: tarea creada con `source_message_id`; badge en mensaje |

**CA cubiertos**: CA-04 (mensajes completos + hilos + tiempo real), CA-05 (parcial: crear desde mensaje).

---

## Sprint 3 — Tareas + Tablero

**Objetivo**: CRUD de tareas, Kanban con drag&drop, subtareas recursivas, filtros y vista lista.

| ID | Descripción | Archivos | Dependencias | Done | Tests |
|---|---|---|---|---|---|
| S3-T01 | Task service + actions: CRUD, validación Zod, `assertMembership`, validación `parent_id` (mismo ws/área, sin ciclos) | `src/server/services/tasks.ts`, `src/server/actions/tasks.ts`, `src/lib/zod/task.ts` | S1 | TASK-01; reglas integridad ARQ-03/SUB-09 | Integration: CRUD + parent inválido rechazado + anti-ciclo |
| S3-T02 | Tablero Kanban 3 columnas, scope área, solo tareas raíz | `src/components/board/Board.tsx`, `Column.tsx`, `Card.tsx` | T01 | BRD-01,02,07 | Component: 3 columnas; solo raíz |
| S3-T03 | Drag&drop (dnd-kit) entre columnas + reorden con `position` fractional | `src/components/board/*`, action `moveTask` | T02 | TASK-03,04; ADR-008 | Integration: cambia status/position; E2E drag |
| S3-T04 | Realtime tablero: cambios de tarea del otro usuario en vivo | `useAreaTasks` hook | T03, S2-T02 | task.created/updated/moved/deleted | Integration: mover en sesión A se ve en B |
| S3-T05 | Detalle de tarea (panel derecho): todos los campos + link a chat origen | `src/components/task/TaskDetail.tsx` | T01 | TASK-06,07 | Component: muestra campos + link |
| S3-T06 | Subtareas: crear (+), misma entidad, 3 niveles indentados en UI, abrir detalle para más profundo | `src/components/task/SubtaskTree.tsx`, actions | T05 | SUB-01..05,09 | Integration: árbol recursivo; Component: 3 niveles |
| S3-T07 | Progreso recursivo "X/Y" + auto-completar sugerido (toast) | CTE en service, `useSubtaskProgress` | T06 | SUB-06,07,08 | Integration: conteo recursivo correcto |
| S3-T08 | Filtros tablero: cliente (stub hasta S4), responsable, prioridad multi-select | `src/components/board/BoardFilters.tsx` | T02 | BRD-03,04,05 | Component: filtra; Integration: query con filtros |
| S3-T09 | Vista lista (toggle) con columnas, orden por header, acciones inline | `src/components/board/ListView.tsx` | T02 | LIST-01..05 | Component: orden + cambio estado inline |
| S3-T10 | Crear rápido "+" en Por hacer; orden manual vs prioridad (toggle) | `Column.tsx` | T03 | BRD-09, TASK-05 | Component: quick add; toggle orden |

**CA cubiertos**: CA-05, CA-06 (drag&drop 3 estados), CA-07 (subtareas 3 niveles), CA-08 (prioridad/responsable/fecha).

---

## Sprint 4 — Clientes + Calendario + Archivo

**Objetivo**: directorio de clientes, vista calendario interna, sync Google Calendar unidireccional, archivo auto+manual+restaurar.

| ID | Descripción | Archivos | Dependencias | Done | Tests |
|---|---|---|---|---|---|
| S4-T01 | Clientes CRUD (todos los campos), activo/inactivo oculta en selectores | `src/server/services/clients.ts`, actions, `src/components/client/*` | S1 | CLI-01..05,10,11 | Integration: CRUD; inactivo no en selector |
| S4-T02 | Vincular cliente a tarea (selector) + activar filtro cliente real en tablero | `TaskDetail`, `BoardFilters`, `tasks` action | T01, S3-T08 | CLI-07, BRD-03 | Integration: filtra por cliente / sin cliente |
| S4-T03 | Ficha cliente: datos + tareas vinculadas de todas las áreas | `src/components/client/ClientDetail.tsx` | T02 | CLI-06,08,09 | Integration: ficha agrupa por área |
| S4-T04 | `calendar_connections`: conectar/desconectar Google, cifrado tokens, refresh on-demand | `src/server/calendar/connection.ts`, `src/lib/crypto.ts`, `api/calendar/connect/route.ts` | S1-T05 | CAL-05; SEC-06 | Integration: token cifrado/descifrado; refresh mock |
| S4-T05 | Sync unidireccional: side-effect al guardar `due_date` (crear/actualizar/borrar evento) | `src/server/calendar/sync.ts`, hook en `tasks` action | T04 | CAL-06,07,08; ARQ-12 | Integration (MSW): crear→evento, cambiar→update, borrar→delete |
| S4-T06 | Selección de calendario destino: responsable si conectado, si no creador; error claro si nadie conectado | `sync.ts` | T05 | CAL-06 reglas | Integration: fallback responsable→creador |
| S4-T07 | Vista calendario interna (mes/semana), color por prioridad, clic abre detalle | `src/components/calendar/CalendarView.tsx` | T05 | CAL-01..04,09,10 | Component: render eventos; clic abre panel |
| S4-T08 | Archivo: auto-archivar (cron 7 días) + manual + restaurar + eliminar permanente | `api/cron/auto-archive/route.ts`, `src/components/archive/*`, actions | S3-T01 | ARC-01..07; ARQ-08 | Integration: cron archiva >7d; restaurar; delete |
| S4-T09 | Vista Archivo global con filtros (área/cliente/responsable/título) | `src/app/(app)/archive/page.tsx` | T08 | ARC-03,04 | Component: filtros |

**CA cubiertos**: CA-09 (CRUD clientes), CA-10 (ficha multi-área), CA-11 (calendario interno), CA-12 (sync Google), CA-13 (archivo auto+manual+restaurar).

---

## Sprint 5 — Pulido + Deploy

**Objetivo**: notificaciones in-app, búsqueda básica, animaciones/empty states/toasts, deploy y export.

| ID | Descripción | Archivos | Dependencias | Done | Tests |
|---|---|---|---|---|---|
| S5-T01 | Notificaciones: campana + badge, lista, marcar leída/todas, realtime, navegación a contexto | `src/components/notifications/*`, service completo | S2-T05 | NOT-01..05 | Integration: eventos crean notif; Component: marcar leídas |
| S5-T02 | Búsqueda básica por título en tablero, archivo y directorio clientes (atajo `/`) | `src/components/search/*` | S3,S4 | TASK-08, ARC-04, D21 | Component: filtra por título |
| S5-T03 | Atajos teclado: `N` nueva tarea, `Esc` cerrar panel, `/` búsqueda | `src/lib/hotkeys.ts` | S3 | UX-10 | Component: hotkeys disparan acción |
| S5-T04 | Animaciones 150–250ms, empty states, toasts, skeleton loaders | componentes varios | S1-S4 | UX-07,11,12 | Component: empty states |
| S5-T05 | Export workspace JSON (admin) | `src/server/actions/export.ts`, `settings/workspace` | S1-T07 | SEC-04 | Integration: JSON con todas las entidades |
| S5-T06 | `robots.txt` noindex + headers seguridad (CSP/HSTS/X-Frame) | `public/robots.txt`, `next.config`, `vercel.json` | — | SEC-05; headers | Smoke: headers presentes |
| S5-T07 | Deploy `tandem.integrascale.online` + env prod + Vercel Cron registrado | `vercel.json`, Vercel dashboard | todo | CA-16 | E2E smoke en preview |

**CA cubiertos**: CA-14 (notificaciones), CA-15 (completo), CA-16 (completo: deploy accesible solo autenticados).

---

## Mapa Sprint → Agentes (de AGENT-PROMPTS.md)

| Sprint | Backend (P1) | Frontend (P2) | Realtime (P3) | Calendar (P4) | QA (P5) |
|---|---|---|---|---|---|
| S1 | T01-T10 backend | T01,T04,T08,T09 UI | — | — | RLS + auth gate |
| S2 | T01,T06 | T03,T04,T06 | T02,T04,T05 | — | chat E2E |
| S3 | T01,T03,T06,T07,T08 | T02,T05,T09,T10 | T04 | — | drag&drop, subtareas |
| S4 | T01,T05,T06,T08 | T03,T07,T09 | — | T04,T05,T06 | sync, archivo |
| S5 | T01,T05 | T02,T03,T04 | T01 | — | E2E-01..12 + Security + Deploy |

---

## Riesgos técnicos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | Google no emite `refresh_token` (consentimiento previo) | Sync calendar roto | `prompt=consent` + `access_type=offline`; botón "reconectar"; detectar ausencia y forzar re-consent. |
| R2 | Sync síncrono añade latencia al guardar tarea (ADR-007) | UX lenta al fijar fecha | Timeout corto (≤3s), guardar tarea aunque el evento falle, marcar `sync_state='error'` y reintentar en background. |
| R3 | RLS mal configurada → fuga cross-workspace | Crítico (seguridad) | Tests de integración IDOR (TESTING-STRATEGY); doble barrera authz app + RLS (ADR-004). |
| R4 | Recursión `parent_id` con ciclos / profundidad | Loops, queries caras | Validación anti-ciclo en action; CTE con límite de profundidad; índice `idx_tasks_parent`. |
| R5 | Realtime Postgres Changes a escala | Latencia chat/tablero | Canales por `area_id`; payload mínimo; fallback refetch. Suficiente para ≤10 usuarios. |
| R6 | Reorden Kanban con `position` entero → renumeraciones | Escrituras masivas | Fractional indexing `numeric` (ADR-008); rebalanceo solo si colisión. |
| R7 | Flash de tema/idioma en SSR | UX | `lang` y clase dark en `<html>` server-side; `next/font`; locale en cookie. |
| R8 | Drizzle (service role) salta RLS por error de código | Fuga datos | `assertMembership` obligatorio + lint/review; service role solo en `src/server/**`. |

---

## Definition of Done (global MVP)

- [ ] CA-01 … CA-16 verificados con test que lo demuestre (no marcar sin evidencia).
- [ ] Suite verde: unit + integration + E2E-01..12 en CI.
- [ ] Cobertura ≥ umbrales de `TESTING-STRATEGY.md`.
- [ ] Security audit sin hallazgos Críticos/Altos abiertos (Prompt 6).
- [ ] i18n: 100% strings con key, ES y EN completos.
- [ ] RLS activa y probada en todas las tablas; 0 IDOR.
- [ ] Tokens Google cifrados at rest; `.env` fuera del repo.
- [ ] Deploy en `tandem.integrascale.online`, solo autenticados, `robots.txt` noindex, headers de seguridad.
- [ ] Cron auto-archivado operativo y verificado.
- [ ] Reportes por sprint en `/docs/reports/`.

---

*Tandem — IMPLEMENTATION-PLAN.md.*
