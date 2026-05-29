import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  areas,
  memberships,
  users,
  workspaces,
  type Membership,
} from "@/db/schema";

/*
 * Áreas predefinidas al crear workspace (WS-05, D31).
 * El `name` se guarda en español; la UI lo muestra vía i18n keys
 * (areas.defaults.*). `key` permite mapear a la traducción.
 */
const DEFAULT_AREAS: { name: string; key: string }[] = [
  { name: "General", key: "general" },
  { name: "Marketing", key: "marketing" },
  { name: "Desarrollo", key: "desarrollo" },
  { name: "Servicio al cliente", key: "servicio_cliente" },
];

type GoogleProfile = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
};

/**
 * Idempotente: tras login con Google
 *  1. upsert del usuario (datos de Google),
 *  2. si el usuario aún no pertenece a ningún workspace, crea uno con las 4
 *     áreas predefinidas y lo añade como admin (AUTH-07).
 * Devuelve el workspace activo y el rol.
 */
export async function bootstrapUserAndWorkspace(profile: GoogleProfile): Promise<{
  workspaceId: string;
  role: Membership["role"];
  created: boolean;
}> {
  // 1) upsert user
  await db
    .insert(users)
    .values({
      id: profile.id,
      email: profile.email,
      name: profile.name ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      locale: profile.locale === "en" ? "en" : "es",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: profile.email,
        name: profile.name ?? null,
        avatarUrl: profile.avatarUrl ?? null,
      },
    });

  // 2) ¿ya tiene workspace?
  const [existing] = await db
    .select({ workspaceId: memberships.workspaceId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, profile.id))
    .limit(1);

  if (existing) {
    return { workspaceId: existing.workspaceId, role: existing.role, created: false };
  }

  // 3) crear workspace + áreas default + membership admin en una transacción
  const result = await db.transaction(async (tx) => {
    const [ws] = await tx
      .insert(workspaces)
      .values({
        name: profile.name ? `Workspace de ${profile.name}` : "Tandem",
        ownerUserId: profile.id,
      })
      .returning({ id: workspaces.id });

    const workspaceId = ws!.id;

    await tx.insert(memberships).values({
      workspaceId,
      userId: profile.id,
      role: "admin",
    });

    await tx.insert(areas).values(
      DEFAULT_AREAS.map((a, i) => ({
        workspaceId,
        name: a.name,
        position: i,
        isDefault: true,
        createdBy: profile.id,
      })),
    );

    return workspaceId;
  });

  return { workspaceId: result, role: "admin" as const, created: true };
}
