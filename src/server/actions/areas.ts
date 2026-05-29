"use server";

import { revalidatePath } from "next/cache";
import {
  assertAdmin,
  resolveActiveWorkspace,
} from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import {
  createAreaSchema,
  deleteAreaSchema,
  updateAreaSchema,
} from "@/lib/zod/area";
import * as areasService from "@/server/services/areas";

/*
 * Server Actions de Áreas. Patrón: authorize() (sesión + membership) →
 * validación Zod → servicio. Workspace derivado de la sesión (no del cliente).
 */

export async function listAreasAction() {
  return toActionResult(async () => {
    const { workspaceId } = await resolveActiveWorkspace();
    return areasService.listAreas(workspaceId);
  });
}

export async function createAreaAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = createAreaSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const area = await areasService.createArea(workspaceId, userId, parsed.data);
    revalidatePath("/areas");
    return area;
  });
}

export async function updateAreaAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = updateAreaSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, role } = await resolveActiveWorkspace();
    assertAdmin(role); // AREA-09: admin o creador; MVP simplifica a admin
    const area = await areasService.updateArea(workspaceId, parsed.data);
    revalidatePath("/areas");
    return area;
  });
}

export async function deleteAreaAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = deleteAreaSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, role } = await resolveActiveWorkspace();
    assertAdmin(role);
    await areasService.deleteArea(workspaceId, parsed.data);
    revalidatePath("/areas");
    return { ok: true };
  });
}

function flatten(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join(".") || "_"] = issue.message;
  }
  return out;
}
