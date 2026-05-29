import { z } from "zod";

export const createAreaSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(40).optional(),
});

export const updateAreaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const deleteAreaSchema = z.object({
  id: z.string().uuid(),
  taskDestination: z.enum(["move_to_general", "delete"]),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type DeleteAreaInput = z.infer<typeof deleteAreaSchema>;
