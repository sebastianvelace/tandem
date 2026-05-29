"use server";

import { revalidatePath } from "next/cache";
import { resolveActiveWorkspace } from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import {
  createTaskFromMessageSchema,
  createTaskSchema,
  deleteTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "@/lib/zod/task";
import * as tasksService from "@/server/services/tasks";

/*
 * Server Actions de tareas (Sprint 3). Patrón: resolveActiveWorkspace
 * (sesión + membership) → Zod → service. El workspace se deriva de la sesión;
 * las escrituras pasan por la conexión de servicio tras la barrera de authz.
 */

export async function createTaskAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const task = await tasksService.createTask(workspaceId, userId, parsed.data);
    revalidatePath(`/areas/${task.areaId}`);
    return task;
  });
}

export async function updateTaskAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const task = await tasksService.updateTask(workspaceId, parsed.data, userId);
    revalidatePath(`/areas/${task.areaId}`);
    return task;
  });
}

export async function moveTaskAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = moveTaskSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId } = await resolveActiveWorkspace();
    return tasksService.moveTask(workspaceId, parsed.data);
  });
}

export async function deleteTaskAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = deleteTaskSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId } = await resolveActiveWorkspace();
    const res = await tasksService.deleteTask(workspaceId, parsed.data.id);
    revalidatePath(`/areas/${res.areaId}`);
    return res;
  });
}

export async function createTaskFromMessageAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = createTaskFromMessageSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Datos inválidos", flatten(parsed.error));
    }
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const task = await tasksService.createTaskFromMessage(
      workspaceId,
      userId,
      parsed.data,
    );
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
