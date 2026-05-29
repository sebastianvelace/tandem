# Reporte — Sprint 3 (Tareas + Tablero)

> Tech lead. CRUD de tareas, Kanban con drag&drop, subtareas recursivas, filtros y vista lista, según IMPLEMENTATION-PLAN §Sprint 3.

## Qué se implementó

| Tarea | Estado | Entregable |
|---|---|---|
| S3-T01 | ✅ | Task service + actions completos (crear/editar/mover/eliminar/listar), Zod (`createTaskSchema`/`updateTaskSchema`/`moveTaskSchema`/`deleteTaskSchema`), `assertMembership` vía actions, validación de `parent_id` (mismo ws/área heredada, **anti-ciclo**) |
| S3-T02 | ✅ | Tablero Kanban 3 columnas (`Board`/`Column`/`Card`), scope área, solo tareas raíz (BRD-01/02/07) |
| S3-T03 | ✅ | Drag&drop con **dnd-kit** entre columnas + reorden; posición **fractional** por punto medio entre vecinos (ADR-008, TASK-03/04) |
| S3-T04 | ✅ | Realtime tablero: hook `useAreaTasks` (Postgres Changes en `tasks`) + migración `0003` (REPLICA IDENTITY FULL + publicación); optimistic updates con reconciliación |
| S3-T05 | ✅ | `TaskDetail` (panel derecho): todos los campos editables inline + nota de origen (chat) cuando hay `source_message_id` (TASK-06/07) |
| S3-T06 | ✅ | Subtareas: misma entidad (`parent_id`), `SubtaskTree` recursivo **3 niveles** indentados en UI; más profundo se abre desde el detalle (SUB-01..05/09) |
| S3-T07 | ✅ | Progreso recursivo "X/Y" (cuenta todos los descendientes) + **toast de auto-completar** sugerido al cerrar todas las subtareas (SUB-06/07/08) |
| S3-T08 | ✅ | Filtros: prioridad (multi), responsable (multi + sin asignar) y **cliente ya funcional** (BRD-03/04/05) |
| S3-T09 | ✅ | Vista lista (toggle) con cabeceras ordenables y cambio de estado inline (LIST-01..05) |
| S3-T10 | ✅ | Creación rápida "+" por columna + toggle de orden manual/prioridad (BRD-09, TASK-05) |

## Verificación (ejecutada)

- ✅ `pnpm typecheck` — sin errores (TS strict).
- ✅ `pnpm build` — compila; `/areas/[areaId]` ahora monta Chat + Tablero (35 kB / 223 kB first load).
- ✅ `pnpm db:migrate` (Postgres 16 efímero) — las **4** migraciones aplican; `0003` portable (igual patrón que `0002`).
- ✅ Estado físico: `tasks` en `supabase_realtime` (1), `REPLICA IDENTITY FULL`, RLS activa, **solo política SELECT**.
- ✅ **Funcional sobre `tasks`**: aislamiento cross-workspace (A solo ve lo suyo), INSERT directo del rol `authenticated` **DENEGADO**, sin JWT 0 filas, y **cascada de subtareas** (borrar la raíz elimina las hijas vía `ON DELETE CASCADE` del self-reference).

## Decisiones tomadas

- **Set plano + derivación en cliente**: el server envía todas las tareas no archivadas del área; el cliente deriva columnas, subárboles, progreso recursivo y filtros (`lib/board/selectors.ts`). Una sola fuente reactiva (Realtime) y cero round-trips para recomputar la vista.
- **Fractional indexing por punto medio** (ADR-008): mover calcula `position` entre los vecinos del punto de inserción (cliente envía `prevId`/`nextId`; el server lee sus posiciones). Pendiente: rebalanceo ante agotamiento de precisión tras muchísimos movimientos en el mismo hueco (raro con 2 usuarios) — anotado como mejora.
- **Área heredada y anti-ciclo** (R4): una subtarea hereda el `area_id` del padre; al asignar padre se recorre la cadena de ancestros y se rechaza si genera ciclo.
- **3 niveles en UI, infinito en datos** (ARQ-03): el `SubtaskTree` indenta hasta 3; más profundo ofrece "abrir para ver más niveles" (abre esa subtarea como detalle).
- **Vista de área con pestañas Chat/Tablero**: ambos paneles montados a la vez (inactivo oculto por CSS) para conservar sus suscripciones Realtime y estado al alternar.
- **dnd-kit** (no react-beautiful-dnd): mantenido React 19 + activación por distancia (5px) para que el clic abra el detalle sin disparar drag.

## CA cubiertos

- **CA-05** (crear desde mensaje → ahora visible en el tablero, completo).
- **CA-06** (drag&drop entre los 3 estados): implementado; verificación visual del realtime entre 2 sesiones requiere `.env`.
- **CA-07** (subtareas 3 niveles): completo.
- **CA-08** (prioridad/responsable/fecha): completo en detalle + filtros + lista.

## Blockers / pendientes

- **Verificación E2E de Realtime/drag** entre dos sesiones: requiere proyecto Supabase real. Con el `.env`: comprobar que mover/crear en A se ve en B sin recargar.
- **Filtro de cliente**: ya es funcional, pero la lista de clientes se enriquece en Sprint 4 (CRUD de clientes).
- **Rebalanceo de posiciones**: implementar renumeración de columna si dos posiciones colisionan por precisión (mejora; no bloquea MVP).
- **Tests automatizados**: portar a `tests/integration/` la prueba SQL de RLS/cascada de `tasks` y casos de service (anti-ciclo, herencia de área, midpoint) — pendiente del agente QA junto con S1/S2.

## Archivos nuevos/clave

```
src/lib/board/types.ts            DTOs del tablero (TaskDTO, TaskStatus, TaskPriority)
src/lib/board/selectors.ts        derivaciones puras: columnas, hijos, progreso, filtros, orden
src/lib/zod/task.ts               Zod CRUD + move (ampliado desde S2)
src/server/services/tasks.ts      CRUD + moveTask (fractional) + anti-ciclo + cascada (ampliado)
src/server/actions/tasks.ts       actions create/update/move/delete (ampliado)
src/hooks/useAreaTasks.ts         realtime del tablero
src/components/board/*            Board, Column, Card, ListView, BoardFilters, TaskDetail,
                                  SubtaskTree, PriorityChip, BoardClient (orquestador)
src/components/area/AreaView.tsx  pestañas Chat / Tablero
src/app/(app)/areas/[areaId]/page.tsx  carga inicial de chat + tareas + AreaView
drizzle/0003_realtime_tasks.sql   publicación realtime + REPLICA IDENTITY FULL para tasks
```
