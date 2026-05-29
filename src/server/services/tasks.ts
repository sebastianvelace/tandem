import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { areas, clients, messages, tasks, type Task } from "@/db/schema";
import { AppError } from "@/server/auth/errors";
import type { CreateTaskFromMessageInput } from "@/lib/zod/task";

/*
 * Servicio de tareas — Sprint 2 solo cubre la creación desde un mensaje
 * (MSG-09..12). Hereda el área del mensaje origen y guarda el enlace
 * bidireccional vía tasks.source_message_id. Sprint 3 amplía el CRUD.
 */

/** Posición de cola para la columna "por hacer" de un área (append al final). */
async function nextRootPosition(
  workspaceId: string,
  areaId: string,
): Promise<string> {
  const rows = await db
    .select({ max: sql<string>`coalesce(max(${tasks.position}), 0)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        eq(tasks.areaId, areaId),
        eq(tasks.status, "por_hacer"),
        sql`${tasks.parentId} IS NULL`,
      ),
    );
  const max = Number(rows[0]?.max ?? 0);
  return String(max + 1);
}

export async function createTaskFromMessage(
  workspaceId: string,
  userId: string,
  input: CreateTaskFromMessageInput,
): Promise<Task> {
  // El mensaje origen fija el área (MSG-10) y valida scope (anti-IDOR).
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

  // El área debe seguir existiendo en el workspace.
  const [area] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, msg.areaId), eq(areas.workspaceId, workspaceId)))
    .limit(1);
  if (!area) throw new AppError("NOT_FOUND", "Área no encontrada");

  if (input.clientId) {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, input.clientId),
          eq(clients.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (!client) throw new AppError("NOT_FOUND", "Cliente no encontrado");
  }

  const position = await nextRootPosition(workspaceId, msg.areaId);

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
      position,
      sourceMessageId: msg.id,
    })
    .returning();
  return created!;
}
