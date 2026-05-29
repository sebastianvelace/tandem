import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bootstrapUserAndWorkspace } from "@/server/services/workspace";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

/*
 * Callback OAuth: intercambia el code por sesión, hace upsert del usuario +
 * bootstrap del workspace (AUTH-07), sincroniza cookie de idioma y redirige.
 * Ruta pública (recibe el code de Google); el gate la excluye.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const user = data.user;
  const meta = user.user_metadata ?? {};

  // Allowlist: si ALLOWED_EMAILS está definido solo esos emails pueden entrar.
  const allowedRaw = process.env.ALLOWED_EMAILS ?? "";
  if (allowedRaw.trim()) {
    const allowed = allowedRaw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes((user.email ?? "").toLowerCase())) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=unauthorized`);
    }
  }

  const { workspaceId } = await bootstrapUserAndWorkspace({
    id: user.id,
    email: user.email ?? meta.email ?? "",
    name: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    locale: isLocale(meta.locale) ? meta.locale : null,
  });

  // Redirección segura: solo rutas internas relativas (evita open redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const destination = safeNext === "/" ? `/areas` : safeNext;

  const response = NextResponse.redirect(`${origin}${destination}`);

  // Sincroniza la cookie de idioma con la preferencia del usuario.
  const locale = isLocale(meta.locale) ? meta.locale : "es";
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  void workspaceId; // disponible para futura lógica de routing por workspace
  return response;
}
