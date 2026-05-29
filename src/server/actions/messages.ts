"use server";

import { resolveActiveWorkspace } from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import {
  deleteMessageSchema,
  editMessageSchema,
  listMessagesSchema,
  listThreadSchema,
  sendMessageSchema,
} from "@/lib/zod/message";
import * as messagesService from "@/server/services/messages";
import { createNotification } from "@/server/services/notifications";

/*
 * Server Actions de mensajes. Patrón: resolveActiveWorkspace (sesión +
 * membership) → Zod → servicio. El workspace se deriva de la sesión, nunca
 * del cliente. Las escrituras pasan por la conexión de servicio (ADR-004).
 */

export async function listMessagesAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = listMessagesSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId } = await resolveActiveWorkspace();
    return messagesService.listAreaMessages(workspaceId, parsed.data.areaId, {
      limit: parsed.data.limit,
      before: parsed.data.before,
    });
  });
}

export async function listThreadAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = listThreadSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId } = await resolveActiveWorkspace();
    return messagesService.listThreadReplies(
      workspaceId,
      parsed.data.parentMessageId,
    );
  });
}

export async function sendMessageAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const { message, parent } = await messagesService.sendMessage(
      workspaceId,
      parsed.data.areaId,
      userId,
      {
        body: parsed.data.body,
        parentMessageId: parsed.data.parentMessageId ?? null,
      },
    );

    // TH-04: notificar al autor del mensaje raíz cuando alguien responde.
    if (parent) {
      await createNotification({
        workspaceId,
        recipientUserId: parent.authorUserId,
        type: "thread_reply",
        entityType: "message",
        entityId: parent.id,
        actorUserId: userId,
        payload: { areaId: parsed.data.areaId, replyId: message.id },
      });
    }

    return {
      id: message.id,
      areaId: message.areaId,
      parentMessageId: message.parentMessageId,
      authorUserId: message.authorUserId,
      body: message.body,
      editedAt: null,
      deletedAt: null,
      createdAt: message.createdAt.toISOString(),
    };
  });
}

export async function editMessageAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = editMessageSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    return messagesService.editMessage(
      workspaceId,
      userId,
      parsed.data.id,
      parsed.data.body,
    );
  });
}

export async function deleteMessageAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = deleteMessageSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    return messagesService.deleteMessage(workspaceId, userId, parsed.data.id);
  });
}

function flatten(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join(".") || "_"] = issue.message;
  }
  return out;
}
