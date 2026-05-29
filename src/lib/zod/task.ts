import { z } from "zod";

/*
 * Zod de tareas (Sprint 3). Cubre CRUD completo, mover en el tablero
 * (fractional indexing vía vecinos) y la conversión mensaje→tarea (Sprint 2).
 * El scope (workspace/área) y las reglas de parent_id se validan en el service.
 */
export const taskPriorityEnum = z.enum(["alta", "media", "baja"]);
export const taskStatusEnum = z.enum(["por_hacer", "en_proceso", "completada"]);

// `nullish` = opcional o null; los selectores envían "" → normaliza en la action.
const optionalUuid = z.string().uuid().nullish();
const optionalDate = z
  .union([z.string().datetime(), z.null()])
  .optional();

export const createTaskSchema = z.object({
  areaId: z.string().uuid(),
  parentId: z.string().uuid().nullish(),
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  description: z.string().trim().max(8000).nullish(),
  status: taskStatusEnum.default("por_hacer"),
  priority: taskPriorityEnum.default("media"),
  assigneeUserId: optionalUuid,
  clientId: optionalUuid,
  dueDate: optionalDate,
});

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(8000).nullish(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  assigneeUserId: optionalUuid,
  clientId: optionalUuid,
  dueDate: optionalDate,
});

export const moveTaskSchema = z.object({
  id: z.string().uuid(),
  status: taskStatusEnum,
  prevId: z.string().uuid().nullish(),
  nextId: z.string().uuid().nullish(),
});

export const deleteTaskSchema = z.object({
  id: z.string().uuid(),
});

export const listBoardSchema = z.object({
  areaId: z.string().uuid(),
});

export const createTaskFromMessageSchema = z.object({
  sourceMessageId: z.string().uuid(),
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  description: z.string().trim().max(8000).optional(),
  priority: taskPriorityEnum.default("media"),
  clientId: optionalUuid,
  assigneeUserId: optionalUuid,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
export type CreateTaskFromMessageInput = z.infer<
  typeof createTaskFromMessageSchema
>;
