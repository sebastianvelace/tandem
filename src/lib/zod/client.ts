import { z } from "zod";

/*
 * Validación de clientes (CLI-01..05). El scope (workspace) lo deriva la
 * action de la sesión. Campos opcionales se normalizan a null en el service.
 */
const emailOpt = z
  .union([z.string().email(), z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  email: emailOpt,
  company: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(4000).optional(),
  isActive: z.boolean().optional(),
});

export const updateClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  email: emailOpt,
  company: z.string().trim().max(120).nullish(),
  phone: z.string().trim().max(40).nullish(),
  notes: z.string().trim().max(4000).nullish(),
  isActive: z.boolean().optional(),
});

export const deleteClientSchema = z.object({ id: z.string().uuid() });

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type DeleteClientInput = z.infer<typeof deleteClientSchema>;
