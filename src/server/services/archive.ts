import "server-only";
import { and, desc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { areas, clients, tasks, users } from "@/db/schema";
import { AppError } from "@/server/auth/errors";

/*
 * Archivo (ARC-01..07, ARQ-08). Archivar = marcar archived_at (no hay tabla
 * separada). Auto-archivado de completadas (cron 7 días), manual, restaurar y
 * eliminar permanente. El tablero ya excluye las archivadas.
 */

export type ArchiveFilters = {
  areaId?: string;
  clientId?: string;
  assigneeUserId?: string;
  query?: string;
};

async function getTaskInWorkspace(id: string, workspaceId: string) {
  const [t] = await db
    .select({ id: tasks.id, areaId: tasks.areaId })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
    .limit(1);
  if (!t) throw new AppError("NOT_FOUND", "Tarea no encontrada");
  return t;
}

/** Archivar manualmente (ARC-02). */
export async function archiveTask(workspaceId: string, id: string) {
  const t = await getTaskInWorkspace(id, workspaceId);
  await db
    .update(tasks)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, id));
  return { id, areaId: t.areaId };
}

/** Restaurar al tablero (ARC-05). */
export async function unarchiveTask(workspaceId: string, id: string) {
  const t = await getTaskInWorkspace(id, workspaceId);
  await db
    .update(tasks)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(tasks.id, id));
  return { id, areaId: t.areaId };
}

/** Eliminar permanentemente (ARC-06). Las subtareas caen por cascade. */
export async function deleteArchivedTask(workspaceId: string, id: string) {
  await getTaskInWorkspace(id, workspaceId);
  await db.delete(tasks).where(eq(tasks.id, id));
  return { id };
}

/** Lista global de archivadas con filtros (ARC-03/04). */
export async function listArchivedTasks(
  workspaceId: string,
  f: ArchiveFilters = {},
) {
  const conds = [
    eq(tasks.workspaceId, workspaceId),
    isNotNull(tasks.archivedAt),
  ];
  if (f.areaId) conds.push(eq(tasks.areaId, f.areaId));
  if (f.clientId) conds.push(eq(tasks.clientId, f.clientId));
  if (f.assigneeUserId) conds.push(eq(tasks.assigneeUserId, f.assigneeUserId));
  if (f.query && f.query.trim())
    conds.push(sql`${tasks.title} ILIKE ${"%" + f.query.trim() + "%"}`);

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      areaId: tasks.areaId,
      areaName: areas.name,
      clientName: clients.name,
      assigneeName: users.name,
      archivedAt: tasks.archivedAt,
    })
    .from(tasks)
    .innerJoin(areas, eq(areas.id, tasks.areaId))
    .leftJoin(clients, eq(clients.id, tasks.clientId))
    .leftJoin(users, eq(users.id, tasks.assigneeUserId))
    .where(and(...conds))
    .orderBy(desc(tasks.archivedAt));
  return rows;
}

/**
 * Auto-archivado (ARC-01, cron): archiva tareas RAÍZ completadas hace más de
 * `days` días y aún no archivadas. Global (todos los workspaces). Devuelve el
 * nº de tareas archivadas. Usa el índice parcial idx_tasks_autoarchive.
 */
export async function autoArchiveCompleted(days = 7): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const updated = await db
    .update(tasks)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(tasks.status, "completada"),
        isNull(tasks.archivedAt),
        isNull(tasks.parentId),
        isNotNull(tasks.completedAt),
        lt(tasks.completedAt, cutoff),
      ),
    )
    .returning({ id: tasks.id });
  return updated.length;
}
