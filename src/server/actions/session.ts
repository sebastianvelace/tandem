"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/server/auth/authz";
import { toActionResult } from "@/server/auth/errors";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

/** Cierra sesión (AUTH-05) e invalida cookies. */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Cambia el idioma del usuario (AUTH-03, I18N-03) y la cookie de UI. */
export async function setLocaleAction(locale: string) {
  return toActionResult(async () => {
    if (!isLocale(locale)) throw new Error("locale inválido");
    const userId = await requireUser();
    await db.update(users).set({ locale }).where(eq(users.id, userId));
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return { locale };
  });
}
