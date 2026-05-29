"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";

/*
 * Login — único método: Google OAuth (AUTH-01).
 * Scopes combinados login + Calendar en un consentimiento (ARQ-06, ADR-002).
 */
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export default function LoginPage() {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(false);
    const supabase = createClient();
    const redirectTo = params.get("redirectTo") ?? "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: GOOGLE_SCOPES,
        redirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <h1 className="text-2xl font-semibold">{tApp("name")}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("loginSubtitle")}
        </p>

        <Button
          className="mt-8 w-full"
          onClick={signIn}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? t("signingIn") : t("continueWithGoogle")}
        </Button>

        {error && (
          <p className="mt-4 text-sm text-[var(--color-danger)]">
            {t("errorGeneric")}
          </p>
        )}
      </div>
    </main>
  );
}
