import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { areas, tasks, type Area } from "@/db/schema";
import { AppError } from "@/server/auth/errors";
import type {
  CreateAreaInput,
  DeleteAreaInput,
  UpdateAreaInput,
} from "@/lib/zod/area";

export async function listAreas(workspaceId: string): Promise<Area[]> {
  return db
    .select()
    .from(areas)
    .where(eq(areas.workspaceId, workspaceId))
    .orderBy(asc(areas.position), asc(areas.createdAt));
}

/** Carga un área verificando que pertenece al workspace (anti-IDOR). */
async function getAreaInWorkspace(id: string, workspaceId: string): Promise<Area> {
  const [area] = await db
    .select()
    .from(areas)
    .where(and(eq(areas.id, id), eq(areas.workspaceId, workspaceId)))
    .limit(1);
  if (!area) throw new AppError("NOT_FOUND", "Área no encontrada");
  return area;
}

export async function createArea(
  workspaceId: string,
  userId: string,
  input: CreateAreaInput,
): Promise<Area> {
  // nombre único por workspace, case-insensitive (AREA-03)
  const dupe = await db
    .select({ id: areas.id })
    .from(areas)
    .where(
      and(
        eq(areas.workspaceId, workspaceId),
        sql`lower(${areas.name}) = lower(${input.name})`,
      ),
    )
    .limit(1);
  if (dupe.length > 0) {
    throw new AppError("CONFLICT", "Ya existe un área con ese nombre", {
      name: "duplicate",
    });
  }

  const posRows = await db
    .select({ max: sql<number>`coalesce(max(${areas.position}), -1)` })
    .from(areas)
    .where(eq(areas.workspaceId, workspaceId));
  const maxPos = posRows[0]?.max ?? -1;

  const [created] = await db
    .insert(areas)
    .values({
      workspaceId,
      name: input.name,
      color: input.color,
      icon: input.icon,
      position: maxPos + 1,
      isDefault: false,
      createdBy: userId,
    })
    .returning();
  return created!;
}

export async function updateArea(
  workspaceId: string,
  input: UpdateAreaInput,
): Promise<Area> {
  await getAreaInWorkspace(input.id, workspaceId);

  if (input.name) {
    const dupe = await db
      .select({ id: areas.id })
      .from(areas)
      .where(
        and(
          eq(areas.workspaceId, workspaceId),
          sql`lower(${areas.name}) = lower(${input.name})`,
          sql`${areas.id} <> ${input.id}`,
        ),
      )
      .limit(1);
    if (dupe.length > 0) {
      throw new AppError("CONFLICT", "Ya existe un área con ese nombre", {
        name: "duplicate",
      });
    }
  }

  const [updated] = await db
    .update(areas)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(eq(areas.id, input.id))
    .returning();
  return updated!;
}

/**
 * Elimina un área (AREA-09). Si destino = move_to_general, reasigna sus tareas
 * al área "General" del workspace antes de borrar; si delete, las tareas caen
 * por cascade. No se permite eliminar el área General por defecto.
 */
export async function deleteArea(
  workspaceId: string,
  input: DeleteAreaInput,
): Promise<void> {
  const area = await getAreaInWorkspace(input.id, workspaceId);

  if (input.taskDestination === "move_to_general") {
    const [general] = await db
      .select({ id: areas.id })
      .from(areas)
      .where(
        and(
          eq(areas.workspaceId, workspaceId),
          eq(areas.isDefault, true),
          sql`lower(${areas.name}) = 'general'`,
        ),
      )
      .limit(1);

    if (!general) {
      throw new AppError("CONFLICT", "No existe el área General destino");
    }
    if (general.id === area.id) {
      throw new AppError("CONFLICT", "No se puede eliminar el área General");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({ areaId: general.id })
        .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.areaId, area.id)));
      await tx.delete(areas).where(eq(areas.id, area.id));
    });
    return;
  }

  await db.delete(areas).where(eq(areas.id, area.id));
}
