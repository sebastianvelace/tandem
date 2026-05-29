import "server-only";
import { google } from "googleapis";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { calendarConnections } from "@/db/schema";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { env } from "@/lib/env";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/*
 * Conexión de Google Calendar por usuario (CAL-05, SEC-06). Reutiliza los
 * provider tokens que Supabase entrega tras el OAuth (scope calendar.events,
 * access_type=offline). Los tokens se guardan CIFRADOS (bytea). El refresh es
 * on-demand: el cliente OAuth refresca el access_token y se re-persiste.
 */

export type ProviderTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: Date | null;
  scope?: string | null;
  googleEmail?: string | null;
};

export async function saveConnection(
  workspaceId: string,
  userId: string,
  tokens: ProviderTokens,
): Promise<void> {
  const values = {
    workspaceId,
    userId,
    provider: "google",
    googleEmail: tokens.googleEmail ?? null,
    accessTokenEnc: encryptToken(tokens.accessToken),
    refreshTokenEnc: encryptToken(tokens.refreshToken),
    tokenExpiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    calendarId: "primary",
  };
  await db
    .insert(calendarConnections)
    .values(values)
    .onConflictDoUpdate({
      target: calendarConnections.userId,
      set: {
        accessTokenEnc: values.accessTokenEnc,
        refreshTokenEnc: values.refreshTokenEnc,
        tokenExpiresAt: values.tokenExpiresAt,
        scope: values.scope,
        googleEmail: values.googleEmail,
      },
    });
}

export async function hasConnection(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const [c] = await db
    .select({ id: calendarConnections.id })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.workspaceId, workspaceId),
        eq(calendarConnections.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(c);
}

export async function deleteConnection(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(calendarConnections)
    .where(
      and(
        eq(calendarConnections.workspaceId, workspaceId),
        eq(calendarConnections.userId, userId),
      ),
    );
}

/**
 * Cliente OAuth2 autenticado para un usuario, o null si no tiene conexión.
 * Persiste el nuevo access_token cuando googleapis lo refresca (evento tokens).
 */
export async function getOAuthClient(
  workspaceId: string,
  userId: string,
): Promise<OAuth2Client | null> {
  const [conn] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.workspaceId, workspaceId),
        eq(calendarConnections.userId, userId),
      ),
    )
    .limit(1);
  if (!conn) return null;

  const client = new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    `${env.appUrl}/api/calendar/callback`,
  );
  client.setCredentials({
    access_token: decryptToken(conn.accessTokenEnc),
    refresh_token: decryptToken(conn.refreshTokenEnc),
    expiry_date: conn.tokenExpiresAt ? conn.tokenExpiresAt.getTime() : undefined,
  });

  client.on("tokens", (t) => {
    // Refresco: re-persistir tokens nuevos (best-effort).
    const set: Partial<typeof calendarConnections.$inferInsert> = {};
    if (t.access_token) set.accessTokenEnc = encryptToken(t.access_token);
    if (t.refresh_token) set.refreshTokenEnc = encryptToken(t.refresh_token);
    if (t.expiry_date) set.tokenExpiresAt = new Date(t.expiry_date);
    if (Object.keys(set).length > 0) {
      void db
        .update(calendarConnections)
        .set(set)
        .where(eq(calendarConnections.id, conn.id));
    }
  });

  return client;
}

export function calendarFor(client: OAuth2Client) {
  return google.calendar({ version: "v3", auth: client });
}
