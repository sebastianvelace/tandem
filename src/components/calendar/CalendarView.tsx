"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import type { TaskPriority, TaskStatus } from "@/lib/board/types";
import { PriorityDot } from "@/components/board/PriorityChip";

/*
 * Vista calendario interna (CAL-01..04/09/10): rejilla mensual, color por
 * prioridad, clic en una tarea navega a su área. Solo lectura del due_date.
 */
export type CalendarTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  areaId: string;
  dueDate: string; // ISO
};

function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const dow = (first.getDay() + 6) % 7; // lunes = 0
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  return start;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function CalendarView({ tasks }: { tasks: CalendarTask[] }) {
  const t = useTranslations("calendar");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const now = new Date();
  const [cursor, setCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) {
      const d = new Date(task.dueDate);
      const key = dayKey(d);
      const arr = map.get(key);
      if (arr) arr.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  const gridStart = startOfMonthGrid(cursor.getFullYear(), cursor.getMonth());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const monthLabel = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(cursor);

  const weekdays = useMemo(() => {
    const base = startOfMonthGrid(2024, 0); // un lunes
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        weekday: "short",
      }).format(d);
    });
  }, [locale]);

  return (
    <div className="flex h-full flex-col px-6 py-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-semibold capitalize">{monthLabel}</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label={t("prev")} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--color-surface-2)]">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]">
            {t("today")}
          </button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label={t("next")} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--color-surface-2)]">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-[var(--color-border)] pb-1 text-xs text-[var(--color-text-faint)]">
        {weekdays.map((w) => (
          <div key={w} className="px-2 capitalize">{w}</div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden rounded-b-[var(--radius)] bg-[var(--color-border)]">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = dayKey(d) === dayKey(now);
          const items = byDay.get(dayKey(d)) ?? [];
          return (
            <div key={d.toISOString()} className={cn(
              "flex min-h-0 flex-col gap-0.5 overflow-y-auto bg-[var(--color-bg)] p-1",
              !inMonth && "opacity-40",
            )}>
              <span className={cn(
                "mb-0.5 text-[11px]",
                isToday
                  ? "flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-faint)]",
              )}>
                {d.getDate()}
              </span>
              {items.map((task) => (
                <button key={task.id} onClick={() => router.push(`/areas/${task.areaId}`)}
                  title={task.title}
                  className={cn(
                    "flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-[var(--color-surface-2)]",
                    task.status === "completada" && "line-through opacity-60",
                  )}>
                  <PriorityDot priority={task.priority} />
                  <span className="truncate">{task.title}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
