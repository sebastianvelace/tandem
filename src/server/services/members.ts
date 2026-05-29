import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { clients, memberships, users } from "@/db/schema";
import type { ClientLite, MemberLite } from "@/lib/chat/types";

/*
 * Lecturas auxiliares del workspace: miembros (para resolver autor/avatar y
 * selectores de responsable) y clientes activos (selector mensaje→tarea).
 */

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<MemberLite[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.workspaceId, workspaceId))
    .orderBy(asc(users.name));
}

export async function listActiveClients(
  workspaceId: string,
): Promise<ClientLite[]> {
  return db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(
      and(eq(clients.workspaceId, workspaceId), eq(clients.isActive, true)),
    )
    .orderBy(asc(clients.name));
}
