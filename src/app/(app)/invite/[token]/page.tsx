"use client";

import { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { acceptInvitationAction } from "@/server/actions/invitations";
import { Button } from "@/components/ui/button";

/*
 * Aceptar invitación (WS-04). El gate ya garantiza sesión Google; aquí el
 * usuario confirma unirse. Botón explícito (no auto-accept en prefetch).
 */
export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvitationAction(token);
      if (res.ok) router.replace("/areas");
      else setError(res.error.message);
    });
  }

  return (
    <main className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <h1 className="text-xl font-semibold">{t("app.name")}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("settings.inviteMember")}
        </p>
        <Button className="mt-6 w-full" onClick={accept} disabled={pending}>
          {t("common.confirm")}
        </Button>
        {error && (
          <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p>
        )}
      </div>
    </main>
  );
}
