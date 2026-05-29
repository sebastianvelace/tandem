import "server-only";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { areas, messages, tasks, type Message } from "@/db/schema";
import { AppError } from "@/server/auth/errors";
import type { MessageDTO, RootMessageDTO } from "@/lib/chat/types";

/*
 * Servicio de mensajes (MSG-01..09). Toda función recibe workspaceId ya
 * resuelto de la sesión por la action; aquí re-verificamos scope (área en
 * workspace, mensaje en workspace) como defensa en profundidad (ADR-004).
 */

function toDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    areaId: m.areaId,
    parentMessageId: m.parentMessageId,
    authorUserId: m.authorUserId,
    body: m.deletedAt ? "" : m.body,
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Verifica que el área pertenece al workspace (anti-IDOR). */
async function assertAreaInWorkspace(
  areaId: string,
  workspaceId: string,
): Promise<void> {
  const [area] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, areaId), eq(areas.workspaceId, workspaceId)))
    .limit(1);
  if (!area) throw new AppError("NOT_FOUND", "Área no encontrada");
}

/** Carga un mensaje verificando que pertenece al workspace. */
async function getMessageInWorkspace(
  id: string,
  workspaceId: string,
): Promise<Message> {
  const [m] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), eq(messages.workspaceId, workspaceId)))
    .limit(1);
  if (!m) throw new AppError("NOT_FOUND", "Mensaje no encontrado");
  return m;
}

/**
 * Lista los mensajes raíz de un área (paginación hacia atrás por createdAt),
 * con el conteo de respuestas de cada hilo (TH-03). Orden ascendente para
 * pintar de arriba a abajo en el chat.
 */
export async function listAreaMessages(
  workspaceId: string,
  areaId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<RootMessageDTO[]> {
  await assertAreaInWorkspace(areaId, workspaceId);
  const limit = opts.limit ?? 50;

  const replyCount = sql<number>`(
    SELECT count(*)::int FROM ${messages} AS r
    WHERE r.parent_message_id = ${messages.id} AND r.deleted_at IS NULL
  )`;
  const hasTask = sql<boolean>`EXISTS (
    SELECT 1 FROM ${tasks} AS tk WHERE tk.source_message_id = ${messages.id}
  )`;

  const rows = await db
    .select({ m: messages, replyCount, hasTask })
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, workspaceId),
        eq(messages.areaId, areaId),
        isNull(messages.parentMessageId),
        opts.before ? lt(messages.createdAt, new Date(opts.before)) : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  // Vienen desc (los más nuevos primero); los devolvemos asc para el render.
  return rows
    .reverse()
    .map((row) => ({
      ...toDTO(row.m),
      replyCount: row.replyCount,
      hasTask: row.hasTask,
    }));
}

/** Lista las respuestas de un hilo en orden ascendente (TH-01). */
export async function listThreadReplies(
  workspaceId: string,
  parentMessageId: string,
): Promise<MessageDTO[]> {
  await getMessageInWorkspace(parentMessageId, workspaceId);
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.workspaceId, workspaceId),
        eq(messages.parentMessageId, parentMessageId),
      ),
    )
    .orderBy(asc(messages.createdAt));
  return rows.map(toDTO);
}

/** Envía un mensaje (raíz o respuesta de hilo). Devuelve el padre si aplica. */
export async function sendMessage(
  workspaceId: string,
  areaId: string,
  authorUserId: string,
  input: { body: string; parentMessageId?: string | null },
): Promise<{ message: Message; parent: Message | null }> {
  await assertAreaInWorkspace(areaId, workspaceId);

  let parent: Message | null = null;
  if (input.parentMessageId) {
    parent = await getMessageInWorkspace(input.parentMessageId, workspaceId);
    if (parent.areaId !== areaId) {
      throw new AppError("VALIDATION", "El hilo pertenece a otra área");
    }
    if (parent.parentMessageId) {
      // Hilos de un solo nivel (ADR-006): no se responde a una respuesta.
      throw new AppError("VALIDATION", "No se puede responder dentro de un hilo");
    }
  }

  const [created] = await db
    .insert(messages)
    .values({
      workspaceId,
      areaId,
      parentMessageId: input.parentMessageId ?? null,
      authorUserId,
      body: input.body,
    })
    .returning();

  return { message: created!, parent };
}

/** Edita un mensaje propio (MSG-04); marca edited_at. */
export async function editMessage(
  workspaceId: string,
  userId: string,
  id: string,
  body: string,
): Promise<MessageDTO> {
  const existing = await getMessageInWorkspace(id, workspaceId);
  if (existing.authorUserId !== userId) {
    throw new AppError("FORBIDDEN", "Solo puedes editar tus mensajes");
  }
  if (existing.deletedAt) {
    throw new AppError("CONFLICT", "El mensaje fue eliminado");
  }
  const [updated] = await db
    .update(messages)
    .set({ body, editedAt: new Date() })
    .where(eq(messages.id, id))
    .returning();
  return toDTO(updated!);
}

/** Borrado lógico (MSG-05): conserva la fila, marca deleted_at. */
export async function deleteMessage(
  workspaceId: string,
  userId: string,
  id: string,
): Promise<MessageDTO> {
  const existing = await getMessageInWorkspace(id, workspaceId);
  if (existing.authorUserId !== userId) {
    throw new AppError("FORBIDDEN", "Solo puedes eliminar tus mensajes");
  }
  const [updated] = await db
    .update(messages)
    .set({ deletedAt: new Date(), body: "" })
    .where(eq(messages.id, id))
    .returning();
  return toDTO(updated!);
}

export { getMessageInWorkspace };
