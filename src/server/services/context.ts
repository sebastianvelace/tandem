import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, workspaces, type Area, type User } from "@/db/schema";
import { resolveActiveWorkspace } from "@/server/auth/authz";
import { listAreas } from "./areas";

export type AppContext = {
  user: User;
  workspaceId: string;
  workspaceName: string;
  role: "admin" | "member" | "viewer";
  areas: Area[];
};

/** Contexto completo para el shell de la app (layout + sidebar). */
export async function getAppContext(): Promise<AppContext> {
  const { userId, workspaceId, role } = await resolveActiveWorkspace();

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const areas = await listAreas(workspaceId);

  return {
    user: user!,
    workspaceId,
    workspaceName: ws?.name ?? "Tandem",
    role,
    areas,
  };
}
