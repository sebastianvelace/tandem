import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { areas, clients, tasks, type Client } from "@/db/schema";
import { AppError } from "@/server/auth/errors";
import type {
  CreateClientInput,
  UpdateClientInput,
} from "@/lib/zod/client";

/*
 * Servicio de clientes (CLI-01..11). El directorio NO es navegación principal
 * (vive en la sidebar); la ficha agrupa las tareas vinculadas de TODAS las
 * áreas (CLI-08/09). Inactivo oculta el cliente de los selectores (CLI-11).
 */

async function getClientInWorkspace(
  id: string,
  workspaceId: string,
): Promise<Client> {
  const [c] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.workspaceId, workspaceId)))
    .limit(1);
  if (!c) throw new AppError("NOT_FOUND", "Cliente no encontrado");
  return c;
}

export async function listClients(
  workspaceId: string,
  opts: { includeInactive?: boolean } = {},
): Promise<Client[]> {
  const where = opts.includeInactive
    ? eq(clients.workspaceId, workspaceId)
    : and(eq(clients.workspaceId, workspaceId), eq(clients.isActive, true));
  return db.select().from(clients).where(where).orderBy(asc(clients.name));
}

export async function getClient(
  workspaceId: string,
  id: string,
): Promise<Client> {
  return getClientInWorkspace(id, workspaceId);
}

/** Tareas vinculadas a un cliente, con el nombre de su área (CLI-08). */
export async function listClientTasks(workspaceId: string, clientId: string) {
  await getClientInWorkspace(clientId, workspaceId);
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      areaId: tasks.areaId,
      areaName: areas.name,
      dueDate: tasks.dueDate,
      archivedAt: tasks.archivedAt,
    })
    .from(tasks)
    .innerJoin(areas, eq(areas.id, tasks.areaId))
    .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.clientId, clientId)))
    .orderBy(asc(areas.name), asc(tasks.position));
}

export async function createClient(
  workspaceId: string,
  userId: string,
  input: CreateClientInput,
): Promise<Client> {
  const [created] = await db
    .insert(clients)
    .values({
      workspaceId,
      name: input.name,
      email: input.email ?? null,
      company: input.company ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive ?? true,
      ownerUserId: userId,
    })
    .returning();
  return created!;
}

export async function updateClient(
  workspaceId: string,
  input: UpdateClientInput,
): Promise<Client> {
  await getClientInWorkspace(input.id, workspaceId);
  const patch: Partial<Client> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.email !== undefined) patch.email = input.email ?? null;
  if (input.company !== undefined) patch.company = input.company ?? null;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [updated] = await db
    .update(clients)
    .set(patch)
    .where(eq(clients.id, input.id))
    .returning();
  return updated!;
}

/** Elimina un cliente; sus tareas quedan con client_id = NULL (FK set null). */
export async function deleteClient(
  workspaceId: string,
  id: string,
): Promise<void> {
  await getClientInWorkspace(id, workspaceId);
  await db.delete(clients).where(eq(clients.id, id));
}
