import { z } from "zod";

/*
 * Validación de mensajes (MSG-01..06). El cuerpo se limita para evitar abusos;
 * el scope (workspace/área) NO se valida aquí: lo deriva la action de la sesión.
 */
export const sendMessageSchema = z.object({
  areaId: z.string().uuid(),
  body: z.string().trim().min(1, "El mensaje no puede estar vacío").max(4000),
  parentMessageId: z.string().uuid().nullish(),
});

export const editMessageSchema = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export const deleteMessageSchema = z.object({
  id: z.string().uuid(),
});

export const listMessagesSchema = z.object({
  areaId: z.string().uuid(),
  before: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const listThreadSchema = z.object({
  parentMessageId: z.string().uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
export type ListMessagesInput = z.infer<typeof listMessagesSchema>;
export type ListThreadInput = z.infer<typeof listThreadSchema>;
