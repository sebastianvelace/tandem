"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveActiveWorkspace } from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import * as archiveService from "@/server/services/archive";

/*
 * Server Actions de archivo (ARC-02/05/06). El workspace se deriva de la sesión.
 */
const idSchema = z.object({ id: z.string().uuid() });

export async function archiveTaskAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Datos inválidos");
    const { workspaceId } = await resolveActiveWorkspace();
    const res = await archiveService.archiveTask(workspaceId, parsed.data.id);
    revalidatePath(`/areas/${res.areaId}`);
    revalidatePath("/archive");
    return res;
  });
}

export async function unarchiveTaskAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Datos inválidos");
    const { workspaceId } = await resolveActiveWorkspace();
    const res = await archiveService.unarchiveTask(workspaceId, parsed.data.id);
    revalidatePath(`/areas/${res.areaId}`);
    revalidatePath("/archive");
    return res;
  });
}

export async function deleteArchivedTaskAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Datos inválidos");
    const { workspaceId } = await resolveActiveWorkspace();
    const res = await archiveService.deleteArchivedTask(workspaceId, parsed.data.id);
    revalidatePath("/archive");
    return res;
  });
}
