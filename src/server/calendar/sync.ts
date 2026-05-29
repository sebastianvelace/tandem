import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarEventLinks, type Task } from "@/db/schema";
import { calendarFor, getOAuthClient, hasConnection } from "./connection";

/*
 * Sync unidireccional Tandem → Google Calendar (CAL-06/07/08, ARQ-12, ADR-007).
 * Side-effect SÍNCRONO al guardar una tarea con due_date. Tolerante a fallos
 * (R2): nunca lanza al llamador; ante error marca sync_state='error' y deja la
 * tarea guardada. Sin conexión de calendario → no-op.
 */
type SyncTask = Pick<
  Task,
  | "id"
  | "workspaceId"
  | "title"
  | "description"
  | "dueDate"
  | "status"
  | "archivedAt"
  | "assigneeUserId"
  | "createdBy"
>;

async function getLink(taskId: string) {
  const [link] = await db
    .select()
    .from(calendarEventLinks)
    .where(eq(calendarEventLinks.taskId, taskId))
    .limit(1);
  return link ?? null;
}

function buildEvent(task: SyncTask) {
  // Evento de día completo en la fecha límite (CAL-02).
  const date = task.dueDate!.toISOString().slice(0, 10);
  const end = new Date(task.dueDate!);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    summary: task.title,
    description: task.description ?? undefined,
    start: { date },
    end: { date: end.toISOString().slice(0, 10) },
  };
}

/** Usuario destino del evento: responsable si está conectado, si no el creador (CAL-06). */
async function pickTargetUser(task: SyncTask): Promise<string | null> {
  if (task.assigneeUserId && (await hasConnection(task.workspaceId, task.assigneeUserId))) {
    return task.assigneeUserId;
  }
  if (await hasConnection(task.workspaceId, task.createdBy)) return task.createdBy;
  return null;
}

async function touchLink(id: string, state: "synced" | "error") {
  await db
    .update(calendarEventLinks)
    .set({ syncState: state, lastSyncedAt: new Date() })
    .where(eq(calendarEventLinks.id, id));
}

async function removeRemoteEvent(workspaceId: string, link: typeof calendarEventLinks.$inferSelect) {
  try {
    const client = await getOAuthClient(workspaceId, link.userId);
    if (client) {
      await calendarFor(client).events.delete({
        calendarId: link.calendarId,
        eventId: link.googleEventId,
      });
    }
  } catch {
    // best-effort (R2): si falla el borrado remoto, igual quitamos el enlace.
  }
  await db.delete(calendarEventLinks).where(eq(calendarEventLinks.id, link.id));
}

/**
 * Reconcilia el evento de Google con el estado de la tarea. Llamar tras
 * crear/actualizar/archivar/eliminar una tarea.
 */
export async function syncTaskDueDate(task: SyncTask): Promise<void> {
  const link = await getLink(task.id);
  const shouldHaveEvent = Boolean(task.dueDate) && !task.archivedAt;

  if (!shouldHaveEvent) {
    if (link) await removeRemoteEvent(task.workspaceId, link);
    return;
  }

  const targetUserId = link?.userId ?? (await pickTargetUser(task));
  if (!targetUserId) return; // nadie con calendario conectado → no-op (CAL-06)

  const client = await getOAuthClient(task.workspaceId, targetUserId);
  if (!client) {
    if (link) await touchLink(link.id, "error");
    return;
  }
  const cal = calendarFor(client);

  try {
    if (link) {
      await cal.events.update({
        calendarId: link.calendarId,
        eventId: link.googleEventId,
        requestBody: buildEvent(task),
      });
      await touchLink(link.id, "synced");
    } else {
      const res = await cal.events.insert({
        calendarId: "primary",
        requestBody: buildEvent(task),
      });
      if (res.data.id) {
        await db.insert(calendarEventLinks).values({
          workspaceId: task.workspaceId,
          taskId: task.id,
          userId: targetUserId,
          googleEventId: res.data.id,
          calendarId: "primary",
          lastSyncedAt: new Date(),
          syncState: "synced",
        });
      }
    }
  } catch {
    // R2: no romper el guardado de la tarea; marcar error si había enlace.
    if (link) await touchLink(link.id, "error");
  }
}

/** Borra el evento asociado a una tarea (al eliminarla). */
export async function removeTaskEvent(taskId: string, workspaceId: string): Promise<void> {
  const link = await getLink(taskId);
  if (link) await removeRemoteEvent(workspaceId, link);
}
