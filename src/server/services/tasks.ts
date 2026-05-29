import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { areas, clients, messages, tasks, type Task } from "@/db/schema";
import { AppError } from "@/server/auth/errors";
import { removeTaskEvent, syncTaskDueDate } from "@/server/calendar/sync";
import type { TaskDTO } from "@/lib/board/types";
import type {
  CreateTaskFromMessageInput,
  CreateTaskInput,
  MoveTaskInput,
  UpdateTaskInput,
} from "@/lib/zod/task";

/*
 * Servicio de tareas (Sprint 3). CRUD + mover (fractional indexing, ADR-008) +
 * subtareas (misma entidad, parent_id, ARQ-03). Toda función recibe workspaceId
 * ya resuelto de la sesión; aquí re-verificamos scope (anti-IDOR) y las reglas
 * de integridad (parent en mismo ws/área, sin ciclos — R4).
 */

function toDTO(t: Task): TaskDTO {
  return {
    id: t.id,
    areaId: t.areaId,
    clientId: t.clientId,
    parentId: t.parentId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeUserId: t.assigneeUserId,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    position: Number(t.position),
    sourceMessageId: t.sourceMessageId,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  };
}

async function assertAreaInWorkspace(areaId: string, workspaceId: string) {
  const [a] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, areaId), eq(areas.workspaceId, workspaceId)))
    .limit(1);
  if (!a) throw new AppError("NOT_FOUND", "Área no encontrada");
}

async function getTaskInWorkspace(id: string, workspaceId: string): Promise<Task> {
  const [t] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  if (!t) throw new AppError("NOT_FOUND", "Tarea no encontrada");
  return t;
}

async function assertClientInWorkspace(
  clientId: string,
  workspaceId: string,
): Promise<void> {
  const [c] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
    .limit(1);
  if (!c) throw new AppError("NOT_FOUND", "Cliente no encontrado");
}

/**
 * Valida el padre de una subtarea (SUB-09, R4): debe existir en el workspace,
 * compartir área y no generar un ciclo (el padre no puede ser descendiente del
 * propio nodo). Devuelve el área heredada del padre.
 */
async function resolveParent(
  parentId: string,
  workspaceId: string,
  selfId?: string,
): Promise<{ areaId: string }> {
  const parent = await getTaskInWorkspace(parentId, workspaceId);
  if (selfId) {
    if (parentId === selfId) {
      throw new AppError("VALIDATION", "Una tarea no puede ser su propia subtarea");
    }
    // Anti-ciclo: subimos por la cadena de ancestros del padre; si topamos con
    // selfId, el padre desciende de la tarea → ciclo.
    let cursor: string | null = parent.parentId;
    let guard = 0;
    while (cursor && guard++ < 100) {
      if (cursor === selfId) {
        throw new AppError("VALIDATION", "Movimiento crearía un ciclo de subtareas");
      }
      const [row]: { parentId: string | null }[] = await db
        .select({ parentId: tasks.parentId })
        .from(tasks)
        .where(eq(tasks.id, cursor))
        .limit(1);
      cursor = row?.parentId ?? null;
    }
  }
  return { areaId: parent.areaId };
}

/** Punto medio fractional entre dos posiciones vecinas (ADR-008). */
function midpoint(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 1;
  if (prev === null) return next! / 2;
  if (next === null) return prev + 1;
  return (prev + next) / 2;
}

/** Posición de cola para (área, status, nivel raíz/padre). */
async function tailPosition(
  workspaceId: string,
  areaId: string,
  status: TaskDTO["status"],
  parentId: string | null,
): Promise<number> {
  const rows = await db
    .select({ max: sql<string>`coalesce(max(${tasks.position}), 0)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.areaId, areaId),
        eq(tasks.status, status),
        parentId ? eq(tasks.parentId, parentId) : isNull(tasks.parentId),
        isNull(tasks.archivedAt),
      ),
    );
  return Number(rows[0]?.max ?? 0) + 1;
}

/** Todas las tareas NO archivadas de un área (raíces + subtareas). */
export async function listAreaTasks(
  workspaceId: string,
  areaId: string,
): Promise<TaskDTO[]> {
  await assertAreaInWorkspace(areaId, workspaceId);
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.areaId, areaId),
        isNull(tasks.archivedAt),
      ),
    )
    .orderBy(asc(tasks.position), asc(tasks.createdAt));
  return rows.map(toDTO);
}

export async function getTask(
  workspaceId: string,
  id: string,
): Promise<TaskDTO> {
  return toDTO(await getTaskInWorkspace(id, workspaceId));
}

/** Tareas con fecha límite (CAL-01..04): todas las áreas, no archivadas. */
export async function listScheduledTasks(workspaceId: string) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      areaId: tasks.areaId,
      areaName: areas.name,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .innerJoin(areas, eq(areas.id, tasks.areaId))
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.archivedAt),
        sql`${tasks.dueDate} IS NOT NULL`,
      ),
    )
    .orderBy(asc(tasks.dueDate));
}

export async function createTask(
  workspaceId: string,
  userId: string,
  input: CreateTaskInput,
): Promise<TaskDTO> {
  let areaId = input.areaId;
  await assertAreaInWorkspace(areaId, workspaceId);

  if (input.parentId) {
    const { areaId: parentArea } = await resolveParent(input.parentId, workspaceId);
    areaId = parentArea; // la subtarea hereda el área del padre (SUB-02)
  }
  if (input.clientId) await assertClientInWorkspace(input.clientId, workspaceId);

  const status = input.status ?? "por_hacer";
  const position = await tailPosition(
    workspaceId,
    areaId,
    status,
    input.parentId ?? null,
  );

  const [created] = await db
    .insert(tasks)
    .values({
      workspaceId,
      areaId,
      parentId: input.parentId ?? null,
      clientId: input.clientId ?? null,
      title: input.title,
      description: input.description ?? null,
      status,
      priority: input.priority ?? "media",
      assigneeUserId: input.assigneeUserId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy: userId,
      position: String(position),
      completedAt: status === "completada" ? new Date() : null,
    })
    .returning();
  if (created!.dueDate) await syncTaskDueDate(created!);
  return toDTO(created!);
}

export async function updateTask(
  workspaceId: string,
  input: UpdateTaskInput,
): Promise<TaskDTO> {
  const existing = await getTaskInWorkspace(input.id, workspaceId);
  if (input.clientId) await assertClientInWorkspace(input.clientId, workspaceId);

  const patch: Partial<Task> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.assigneeUserId !== undefined)
    patch.assigneeUserId = input.assigneeUserId ?? null;
  if (input.clientId !== undefined) patch.clientId = input.clientId ?? null;
  if (input.dueDate !== undefined)
    patch.dueDate = input.dueDate ? new Date(input.dueDate) : null;

  if (input.status !== undefined && input.status !== existing.status) {
    patch.status = input.status;
    patch.completedAt =
      input.status === "completada" ? new Date() : null;
  }
  patch.updatedAt = new Date();

  const [updated] = await db
    .update(tasks)
    .set(patch)
    .where(eq(tasks.id, input.id))
    .returning();
  // Sync side-effect (ADR-007): refleja due_date/archivado en Google Calendar.
  await syncTaskDueDate(updated!);
  return toDTO(updated!);
}

/**
 * Mueve una tarea en el tablero (TASK-03/04): cambia status y recoloca entre
 * los vecinos indicados con fractional indexing. Solo raíces se mueven en el
 * tablero, pero la función es válida también dentro de un nivel.
 */
export async function moveTask(
  workspaceId: string,
  input: MoveTaskInput,
): Promise<TaskDTO> {
  const existing = await getTaskInWorkspace(input.id, workspaceId);

  let prevPos: number | null = null;
  let nextPos: number | null = null;
  if (input.prevId) {
    const prev = await getTaskInWorkspace(input.prevId, workspaceId);
    prevPos = Number(prev.position);
  }
  if (input.nextId) {
    const next = await getTaskInWorkspace(input.nextId, workspaceId);
    nextPos = Number(next.position);
  }

  const position = midpoint(prevPos, nextPos);
  const statusChanged = input.status !== existing.status;

  const [updated] = await db
    .update(tasks)
    .set({
      status: input.status,
      position: String(position),
      completedAt: statusChanged
        ? input.status === "completada"
          ? new Date()
          : null
        : existing.completedAt,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, input.id))
    .returning();
  return toDTO(updated!);
}

export async function deleteTask(
  workspaceId: string,
  id: string,
): Promise<{ id: string; areaId: string }> {
  const existing = await getTaskInWorkspace(id, workspaceId);
  // Borra el evento de Google asociado antes de eliminar (CAL-08, best-effort).
  await removeTaskEvent(id, workspaceId);
  // Las subtareas caen por ON DELETE CASCADE (parent_id self-reference).
  await db.delete(tasks).where(eq(tasks.id, id));
  return { id, areaId: existing.areaId };
}

export async function createTaskFromMessage(
  workspaceId: string,
  userId: string,
  input: CreateTaskFromMessageInput,
): Promise<Task> {
  const [msg] = await db
    .select({ id: messages.id, areaId: messages.areaId })
    .from(messages)
    .where(
      and(
        eq(messages.id, input.sourceMessageId),
        eq(messages.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!msg) throw new AppError("NOT_FOUND", "Mensaje origen no encontrado");
  await assertAreaInWorkspace(msg.areaId, workspaceId);
  if (input.clientId) await assertClientInWorkspace(input.clientId, workspaceId);

  const position = await tailPosition(workspaceId, msg.areaId, "por_hacer", null);

  const [created] = await db
    .insert(tasks)
    .values({
      workspaceId,
      areaId: msg.areaId,
      clientId: input.clientId ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      assigneeUserId: input.assigneeUserId ?? null,
      createdBy: userId,
      position: String(position),
      sourceMessageId: msg.id,
    })
    .returning();
  return created!;
}

export { resolveParent };
