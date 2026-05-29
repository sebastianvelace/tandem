"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { memberships, users } from "@/db/schema";
import {
  assertAdmin,
  requireUser,
  resolveActiveWorkspace,
} from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import * as invService from "@/server/services/invitations";
import { env } from "@/lib/env";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

/** WS-04: el admin invita a un cofounder; devuelve el link de invitación. */
export async function inviteMemberAction(input: unknown) {
  return toActionResult(async () => {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Email inválido");
    }
    const { workspaceId, userId, role } = await resolveActiveWorkspace();
    assertAdmin(role);
    const { token, expiresAt } = await invService.createInvitation(
      workspaceId,
      userId,
      parsed.data.email,
      parsed.data.role,
    );
    return {
      inviteUrl: `${env.appUrl}/invite/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  });
}

/** Acepta una invitación (usuario ya autenticado vía Google). */
export async function acceptInvitationAction(token: string) {
  return toActionResult(async () => {
    const userId = await requireUser();
    const membership = await invService.acceptInvitation(token, userId);
    return { workspaceId: membership.workspaceId };
  });
}

/** WS-03: lista de miembros del workspace. */
export async function listMembersAction() {
  return toActionResult(async () => {
    const { workspaceId } = await resolveActiveWorkspace();
    return db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.workspaceId, workspaceId));
  });
}
