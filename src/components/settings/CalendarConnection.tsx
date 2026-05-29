"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  connectCalendarAction,
  disconnectCalendarAction,
} from "@/server/actions/calendar";

/*
 * Conectar/desconectar Google Calendar (CAL-05). El estado inicial llega del
 * servidor; las acciones reutilizan los provider tokens de la sesión.
 */
export function CalendarConnection({ initialConnected }: { initialConnected: boolean }) {
  const t = useTranslations("settings");
  const [connected, setConnected] = useState(initialConnected);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    setError(null);
    const res = await connectCalendarAction();
    setPending(false);
    if (res.ok) setConnected(true);
    else setError(res.error.message);
  }

  async function disconnect() {
    setPending(true);
    const res = await disconnectCalendarAction();
    setPending(false);
    if (res.ok) setConnected(false);
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
          <Calendar size={16} />
        </span>
        <div>
          <p className="text-sm font-medium">{t("googleCalendar")}</p>
          {connected ? (
            <p className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <Check size={12} /> {t("calendarConnected")}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-text-faint)]">
              {t("calendarNotConnected")}
            </p>
          )}
          {error && <p className="mt-0.5 text-xs text-[var(--color-danger)]">{error}</p>}
        </div>
      </div>
      {connected ? (
        <Button variant="outline" size="sm" onClick={() => void disconnect()} disabled={pending}>
          {t("disconnect")}
        </Button>
      ) : (
        <Button size="sm" onClick={() => void connect()} disabled={pending}>
          {t("connectCalendar")}
        </Button>
      )}
    </div>
  );
}
