import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notifications, type Notification } from "@/db/schema";

/*
 * Servicio de notificaciones. La escritura (createNotification) se usa desde
 * S2 (thread_reply) y S3/S5 (task_assigned, etc.). La lectura/marcado y el
 * realtime de la campana son S5-T01 (NOT-01..05).
 */

export type NotificationDTO = {
  id: string;
  type: Notification["type"];
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

function toDTO(n: Notification): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    entityType: n.entityType,
    entityId: n.entityId,
    actorUserId: n.actorUserId,
    payload: (n.payload as Record<string, unknown> | null) ?? null,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listNotifications(
  workspaceId: string,
  userId: string,
  limit = 30,
): Promise<NotificationDTO[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.recipientUserId, userId),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows.map(toDTO);
}

export async function unreadCount(
  workspaceId: string,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt),
      ),
    );
  return rows[0]?.n ?? 0;
}

export async function markRead(
  workspaceId: string,
  userId: string,
  id: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.recipientUserId, userId),
      ),
    );
}

export async function markAllRead(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.recipientUserId, userId),
        isNull(notifications.readAt),
      ),
    );
}

type CreateNotificationInput = {
  workspaceId: string;
  recipientUserId: string;
  type: Notification["type"];
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  payload?: Record<string, unknown> | null;
};

/** Inserta una notificación. No notifica al propio actor (auto-acciones). */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  if (input.actorUserId && input.actorUserId === input.recipientUserId) return;

  await db.insert(notifications).values({
    workspaceId: input.workspaceId,
    recipientUserId: input.recipientUserId,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId ?? null,
    payload: input.payload ?? null,
  });
}
