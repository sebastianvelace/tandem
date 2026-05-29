"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveWorkspace } from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import { createTaskFromMessageSchema } from "@/lib/zod/task";
import { createTaskFromMessage } from "@/server/services/tasks";

/*
 * Server Actions de tareas — Sprint 2: conversión mensaje→tarea (MSG-09..12).
 * El CRUD completo del tablero se añade en Sprint 3.
 */
export async function createTaskFromMessageAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = createTaskFromMessageSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const task = await createTaskFromMessage(workspaceId, userId, parsed.data);
    revalidatePath(`/areas/${task.areaId}`);
    return { id: task.id, areaId: task.areaId, title: task.title };
  });
}

function flatten(error: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    out[issue.path.join(".") || "_"] = issue.message;
  }
  return out;
}
