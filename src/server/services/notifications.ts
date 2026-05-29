import "server-only";
import { db } from "@/db/client";
import { notifications, type Notification } from "@/db/schema";

/*
 * Servicio base de notificaciones (S2-T05). En Sprint 2 solo se ESCRIBE la
 * fila (thread_reply); la campana/realtime/marcar-leída llegan en S5-T01.
 */

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
