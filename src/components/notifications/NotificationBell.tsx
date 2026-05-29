"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import { useNotifications } from "@/hooks/useNotifications";

/*
 * Campana de notificaciones (NOT-01..05): badge de no leídas, lista, marcar
 * leída/todas y navegación al contexto. Realtime vía useNotifications.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const t = useTranslations("notifications");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { items, unread, markRead, markAll } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function openContext(payload: Record<string, unknown> | null, id: string, read: boolean) {
    if (!read) void markRead(id);
    const areaId = payload && typeof payload.areaId === "string" ? payload.areaId : null;
    if (areaId) router.push(`/areas/${areaId}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-scale-in glass absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-[var(--radius)] border border-white/[0.1] bg-black/70 shadow-[0_8px_40px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
            <span className="text-sm font-semibold">{t("title")}</span>
            {unread > 0 && (
              <button onClick={() => void markAll()} className="text-xs text-[var(--color-accent-hover)] hover:underline">
                {t("markAll")}
              </button>
            )}
          </div>
          <ul className="stagger max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--color-text-faint)]">
                {t("empty")}
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openContext(n.payload, n.id, Boolean(n.readAt))}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-white/[0.06] px-4 py-2.5 text-left hover:bg-white/[0.06]",
                      !n.readAt && "bg-white/[0.05]",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {!n.readAt && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                      )}
                      {t(`type.${n.type}`)}
                    </span>
                    <span className="text-xs text-[var(--color-text-faint)]">
                      {formatDateTime(n.createdAt, locale)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
