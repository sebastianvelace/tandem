import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/*
 * Sesión/usuario autenticado desde las cookies del request.
 * `cache` deduplica la llamada dentro del mismo render/acción.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user; // null si no hay sesión
});
