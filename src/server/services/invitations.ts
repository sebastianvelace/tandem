import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  memberships,
  users,
  workspaceInvitations,
  type Membership,
} from "@/db/schema";
import { AppError } from "@/server/auth/errors";

const INVITE_TTL_DAYS = 7;

/** Crea una invitación con token único (WS-04). */
export async function createInvitation(
  workspaceId: string,
  invitedBy: string,
  email: string,
  role: "admin" | "member",
): Promise<{ token: string; expiresAt: Date }> {
  // ¿ya es miembro?
  const existing = await db
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.workspaceId, workspaceId), eq(users.email, email)))
    .limit(1);
  if (existing.length > 0) {
    throw new AppError("CONFLICT", "Ese email ya es miembro del workspace");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

  await db.insert(workspaceInvitations).values({
    workspaceId,
    email,
    role,
    token,
    invitedBy,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Acepta una invitación: valida token, vigencia, y crea la membership para el
 * usuario autenticado. Idempotente respecto a la membership.
 */
export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<Membership> {
  const [inv] = await db
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.token, token),
        isNull(workspaceInvitations.acceptedAt),
      ),
    )
    .limit(1);

  if (!inv) throw new AppError("NOT_FOUND", "Invitación inválida o ya usada");
  if (inv.expiresAt.getTime() < Date.now()) {
    throw new AppError("CONFLICT", "La invitación ha caducado");
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.workspaceId, inv.workspaceId),
          eq(memberships.userId, userId),
        ),
      )
      .limit(1);

    const membership =
      existing ??
      (
        await tx
          .insert(memberships)
          .values({
            workspaceId: inv.workspaceId,
            userId,
            role: inv.role,
          })
          .returning()
      )[0]!;

    await tx
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, inv.id));

    return membership;
  });
}
