"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveWorkspace } from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import {
  createClientSchema,
  deleteClientSchema,
  updateClientSchema,
} from "@/lib/zod/client";
import * as clientsService from "@/server/services/clients";

/*
 * Server Actions de clientes (Sprint 4). Patrón: resolveActiveWorkspace →
 * Zod → service. El workspace se deriva de la sesión.
 */
export async function createClientAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = createClientSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const client = await clientsService.createClient(
      workspaceId,
      userId,
      parsed.data,
    );
    revalidatePath("/clients");
    return client;
  });
}

export async function updateClientAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = updateClientSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId } = await resolveActiveWorkspace();
    const client = await clientsService.updateClient(workspaceId, parsed.data);
    revalidatePath("/clients");
    revalidatePath(`/clients/${parsed.data.id}`);
    return client;
  });
}

export async function deleteClientAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = deleteClientSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId } = await resolveActiveWorkspace();
    await clientsService.deleteClient(workspaceId, parsed.data.id);
    revalidatePath("/clients");
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
