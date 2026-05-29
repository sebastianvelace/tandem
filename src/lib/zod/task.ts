import { z } from "zod";

/*
 * Zod de tareas. En Sprint 2 solo se usa la conversión mensaje→tarea
 * (MSG-09..12); el CRUD completo de tareas y sus reglas (parent_id, anti-ciclo)
 * llegan en Sprint 3 y ampliarán este archivo.
 */
export const taskPriorityEnum = z.enum(["alta", "media", "baja"]);

export const createTaskFromMessageSchema = z.object({
  sourceMessageId: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  description: z.string().trim().max(8000).optional(),
  priority: taskPriorityEnum.default("media"),
  clientId: z.string().uuid().nullish(),
  assigneeUserId: z.string().uuid().nullish(),
});

export type CreateTaskFromMessageInput = z.infer<
  typeof createTaskFromMessageSchema
>;
