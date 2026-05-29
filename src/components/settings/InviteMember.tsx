"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { inviteMemberAction } from "@/server/actions/invitations";
import { Button } from "@/components/ui/button";

/** UI de invitación (WS-04). Genera y muestra el link para compartir. */
export function InviteMember() {
  const t = useTranslations("settings");
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setInviteUrl(null);
    startTransition(async () => {
      const res = await inviteMemberAction({ email: email.trim(), role: "member" });
      if (res.ok) {
        setInviteUrl(res.data.inviteUrl);
        setEmail("");
      } else {
        setError(res.error.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("inviteEmail")}
          aria-label={t("inviteEmail")}
          className="flex-1 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <Button onClick={submit} disabled={pending || !email.trim()}>
          {t("inviteMember")}
        </Button>
      </div>
      {inviteUrl && (
        <p className="break-all rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2 text-xs text-[var(--color-text-muted)]">
          {inviteUrl}
        </p>
      )}
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
