"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell, LogOut, Languages } from "lucide-react";
import { logoutAction, setLocaleAction } from "@/server/actions/session";
import type { User } from "@/db/schema";

/*
 * Header (§6.6): campana de notificaciones (placeholder S5), avatar y
 * conmutador de idioma + logout. Desktop-first.
 */
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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5">
      <h1 className="text-base font-semibold">{title ?? t("app.name")}</h1>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleLocale}
          disabled={pending}
          aria-label={t("settings.language")}
          title={`${t("settings.language")}: ${locale.toUpperCase()}`}
          className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
        >
          <Languages size={16} />
          <span className="uppercase">{locale}</span>
        </button>

        <button
          aria-label="Notificaciones"
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
        >
          <Bell size={16} />
        </button>

        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name ?? user.email}
            className="h-8 w-8 rounded-full border border-[var(--color-border)]"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-xs font-medium">
            {initials}
          </span>
        )}

        <button
          onClick={() => startTransition(() => logoutAction())}
          disabled={pending}
          aria-label={t("auth.logout")}
          title={t("auth.logout")}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
