import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  areas,
  clients,
  memberships,
  messages,
  tasks,
  users,
  workspaces,
} from "@/db/schema";

/*
 * Export del workspace a JSON (SEC-04, S5-T05). Solo admin (la action valida).
 * No incluye datos sensibles: NO exporta tokens de calendario ni notificaciones.
 */
export async function exportWorkspace(workspaceId: string) {
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const [memberRows, areaRows, clientRows, taskRows, messageRows] =
    await Promise.all([
      db
        .select({
          userId: memberships.userId,
          role: memberships.role,
          name: users.name,
          email: users.email,
        })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(eq(memberships.workspaceId, workspaceId)),
      db.select().from(areas).where(eq(areas.workspaceId, workspaceId)),
      db.select().from(clients).where(eq(clients.workspaceId, workspaceId)),
      db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
      db.select().from(messages).where(eq(messages.workspaceId, workspaceId)),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    workspace: ws ? { id: ws.id, name: ws.name, createdAt: ws.createdAt } : null,
    members: memberRows,
    areas: areaRows,
    clients: clientRows,
    tasks: taskRows,
    messages: messageRows,
  };
}
