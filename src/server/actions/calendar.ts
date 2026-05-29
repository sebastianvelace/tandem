"use server";

import { resolveActiveWorkspace } from "@/server/auth/authz";
import { AppError, toActionResult } from "@/server/auth/errors";
import { createClient } from "@/lib/supabase/server";
import {
  deleteConnection,
  hasConnection,
  saveConnection,
} from "@/server/calendar/connection";

/*
 * Conectar/desconectar Google Calendar (CAL-05). Reutiliza los provider tokens
 * que Supabase guarda tras el OAuth de login (scope calendar.events,
 * access_type=offline, prompt=consent). El refresh_token solo se entrega en el
 * primer consentimiento (R1): si falta, hay que reconectar re-logueando.
 */
export async function getCalendarStatusAction() {
  return toActionResult(async () => {
    const { workspaceId, userId } = await resolveActiveWorkspace();
    return { connected: await hasConnection(workspaceId, userId) };
  });
}

export async function connectCalendarAction() {
  return toActionResult(async () => {
    const { workspaceId, userId } = await resolveActiveWorkspace();
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.provider_token ?? null;
    const refreshToken = session?.provider_refresh_token ?? null;
    if (!accessToken || !refreshToken) {
      throw new AppError(
        "CALENDAR_NOT_CONNECTED",
        "No se recibieron tokens de Google. Cierra sesión y vuelve a entrar para reconectar.",
      );
    }

    await saveConnection(workspaceId, userId, {
      accessToken,
      refreshToken,
      googleEmail: session?.user.email ?? null,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });
    return { connected: true };
  });
}

export async function disconnectCalendarAction() {
  return toActionResult(async () => {
    const { workspaceId, userId } = await resolveActiveWorkspace();
    await deleteConnection(workspaceId, userId);
    return { connected: false };
  });
}
