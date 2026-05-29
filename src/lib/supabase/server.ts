import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/*
 * Cliente de servidor ligado a las cookies de sesión del request.
 * Se usa para leer la sesión/usuario autenticado en Server Components,
 * Server Actions, Route Handlers y middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll puede llamarse desde un Server Component; el middleware
          // refresca la sesión, así que aquí se ignora con seguridad.
        }
      },
    },
  });
}
