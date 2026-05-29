"use server";

import { z } from "zod";
import { resolveActiveWorkspace } from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import * as notifService from "@/server/services/notifications";

/*
 * Server Actions de notificaciones (S5-T01, NOT-01..05). El workspace y el
 * usuario se derivan de la sesión: cada usuario solo ve/gestiona las suyas.
 */
const idSchema = z.object({ id: z.string().uuid() });

export async function listNotificationsAction() {
  return toActionResult(async () => {
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const [items, unread] = await Promise.all([
      notifService.listNotifications(workspaceId, userId),
      notifService.unreadCount(workspaceId, userId),
    ]);
    return { items, unread };
  });
}

export async function markNotificationReadAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Datos inválidos");
    const { workspaceId, userId } = await resolveActiveWorkspace();
    await notifService.markRead(workspaceId, userId, parsed.data.id);
    return { ok: true };
  });
}

export async function markAllNotificationsReadAction() {
  return toActionResult(async () => {
    const { workspaceId, userId } = await resolveActiveWorkspace();
    await notifService.markAllRead(workspaceId, userId);
    return { ok: true };
  });
}
