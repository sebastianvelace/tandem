"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/*
 * Cliente de navegador (anon key + sesión del usuario).
 * Usado para suscripciones Realtime: RLS filtra por workspace (ADR-004).
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
