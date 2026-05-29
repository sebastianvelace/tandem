import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { memberships, type Membership } from "@/db/schema";
import { getSessionUser } from "./session";
import { AppError } from "./errors";

/*
 * Helpers de autorización — BARRERA PRINCIPAL (ARQ-11, ADR-004).
 * Toda Server Action de datos llama a requireUser + assertMembership ANTES
 * de tocar la DB. El workspace_id se DERIVA de la membership, nunca se confía
 * en el que envíe el cliente.
 */

export type AuthContext = {
  userId: string;
  workspaceId: string;
  role: Membership["role"];
};

/** Exige sesión válida; devuelve el userId o lanza UNAUTHENTICATED. */
export async function requireUser(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Debes iniciar sesión");
  return user.id;
}

/** Verifica que el usuario pertenece al workspace; devuelve su rol. */
export async function assertMembership(
  workspaceId: string,
  userId: string,
): Promise<Membership["role"]> {
  const [m] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.workspaceId, workspaceId),
        eq(memberships.userId, userId),
      ),
    )
    .limit(1);

  if (!m) {
    // 404, no 403: no revelamos existencia de recursos ajenos (anti-IDOR).
    throw new AppError("NOT_FOUND", "Recurso no encontrado");
  }
  return m.role;
}

/** Exige que el rol sea admin. */
export function assertAdmin(role: Membership["role"]): void {
  if (role !== "admin") {
    throw new AppError("FORBIDDEN", "Requiere permisos de administrador");
  }
}

/**
 * Contexto de autorización para una acción sobre un workspace concreto.
 * Resuelve sesión + membership en un solo paso.
 */
export async function authorize(workspaceId: string): Promise<AuthContext> {
  const userId = await requireUser();
  const role = await assertMembership(workspaceId, userId);
  return { userId, workspaceId, role };
}

/**
 * Resuelve el workspace activo del usuario (MVP: un workspace por usuario).
 * Útil cuando la acción no recibe workspaceId explícito.
 */
export async function resolveActiveWorkspace(): Promise<AuthContext> {
  const userId = await requireUser();
  const [m] = await db
    .select({ workspaceId: memberships.workspaceId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);

  if (!m) throw new AppError("NOT_FOUND", "Sin workspace asignado");
  return { userId, workspaceId: m.workspaceId, role: m.role };
}
