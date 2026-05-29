"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, Languages } from "lucide-react";
import { logoutAction, setLocaleAction } from "@/server/actions/session";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { User } from "@/db/schema";

export function Header({ user, title }: { user: User; title?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleLocale() {
    const next = locale === "es" ? "en" : "es";
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();

  return (
    <header className="glass flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/40 px-5">
      <h1 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
        {title ?? t("app.name")}
      </h1>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleLocale}
          disabled={pending}
          aria-label={t("settings.language")}
          title={`${t("settings.language")}: ${locale.toUpperCase()}`}
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.07] hover:text-[var(--color-text)]"
        >
          <Languages size={14} />
          <span className="uppercase">{locale}</span>
        </button>

        <NotificationBell userId={user.id} />

        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name ?? user.email}
            className="h-8 w-8 rounded-full border border-white/20 object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-white/20 to-white/5 text-xs font-semibold text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]">
            {initials}
          </span>
        )}

        <button
          onClick={() => startTransition(() => logoutAction())}
          disabled={pending}
          aria-label={t("auth.logout")}
          title={t("auth.logout")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.07] hover:text-[var(--color-text)]"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
