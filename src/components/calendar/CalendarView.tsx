"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import type { TaskPriority, TaskStatus } from "@/lib/board/types";
import { PriorityDot } from "@/components/board/PriorityChip";
import { createTaskAction } from "@/server/actions/tasks";

export type CalendarTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  areaId: string;
  dueDate: string;
};

type AreaLite = { id: string; name: string };

type NewEventState = {
  date: Date;
  title: string;
  areaId: string;
};

function startOfMonthGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1);
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  start.setHours(0, 0, 0, 0);
  return start;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function toDateOnlyISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00:00.000Z`;
}

export function CalendarView({
  tasks: initialTasks,
  areas,
}: {
  tasks: CalendarTask[];
  areas: AreaLite[];
}) {
  const t = useTranslations("calendar");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const now = new Date();
  const [cursor, setCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [tasks, setTasks] = useState(initialTasks);
  const [newEvent, setNewEvent] = useState<NewEventState | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    const base = startOfMonthGrid(2024, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        weekday: "short",
      }).format(d);
    });
  }, [locale]);

  // Versión corta del día para móvil (Lu, Ma, ...)
  const weekdaysShort = useMemo(() => {
    const base = startOfMonthGrid(2024, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        weekday: "narrow",
      }).format(d);
    });
  }, [locale]);

  function openNewEvent(date: Date) {
    setNewEvent({ date, title: "", areaId: areas[0]?.id ?? "" });
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function saveEvent() {
    if (!newEvent || !newEvent.title.trim() || !newEvent.areaId) return;
    setSaving(true);
    const res = await createTaskAction({
      areaId: newEvent.areaId,
      title: newEvent.title.trim(),
      dueDate: toDateOnlyISO(newEvent.date),
    });
    setSaving(false);
    if (res.ok) {
      const task = res.data;
      setTasks((prev) => [
        ...prev,
        {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          areaId: task.areaId,
          dueDate: task.dueDate ?? toDateOnlyISO(newEvent.date),
        },
      ]);
      setNewEvent(null);
      router.refresh();
    }
  }

  return (
    <div className="flex h-full flex-col px-3 py-3 md:px-6 md:py-5">
      {/* Encabezado */}
      <div className="mb-3 flex items-center gap-2 md:mb-4 md:gap-3">
        <h1 className="text-sm font-semibold capitalize md:text-base">{monthLabel}</h1>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label={t("prev")}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--color-surface-2)]"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            {t("today")}
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label={t("next")}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-[var(--color-surface-2)]"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {areas.length > 0 && (
          <button
            onClick={() => openNewEvent(new Date())}
            className="ml-auto flex items-center gap-1 rounded-[var(--radius)] border border-[var(--color-border-strong)] px-2 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] md:gap-1.5 md:px-3"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Añadir tarea</span>
          </button>
        )}
      </div>

      {/* Modal nueva tarea */}
      {newEvent && (
        <div className="mb-3 animate-slide-up rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveEvent();
                if (e.key === "Escape") setNewEvent(null);
              }}
              placeholder="Título de la tarea..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            <button
              onClick={() => setNewEvent(null)}
              className="shrink-0 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={newEvent.areaId}
              onChange={(e) => setNewEvent({ ...newEvent, areaId: e.target.value })}
              className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs focus:outline-none"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={`${newEvent.date.getFullYear()}-${String(newEvent.date.getMonth() + 1).padStart(2, "0")}-${String(newEvent.date.getDate()).padStart(2, "0")}`}
              onChange={(e) => {
                const d = new Date(e.target.value + "T12:00:00");
                if (!isNaN(d.getTime())) setNewEvent({ ...newEvent, date: d });
              }}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs focus:outline-none"
            />
            <button
              onClick={() => void saveEvent()}
              disabled={saving || !newEvent.title.trim()}
              className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-[var(--color-bg)] disabled:opacity-40"
            >
              {saving ? "…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-white/[0.1] pb-1.5 text-xs text-[var(--color-text-faint)]">
        {weekdays.map((w, i) => (
          <div key={w} className="px-1 capitalize tracking-wide">
            <span className="hidden md:inline">{w}</span>
            <span className="md:hidden">{weekdaysShort[i]}</span>
          </div>
        ))}
      </div>

      {/* Rejilla */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden rounded-b-[var(--radius)] bg-white/[0.08]">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = dayKey(d) === dayKey(now);
          const items = byDay.get(dayKey(d)) ?? [];
          return (
            <div
              key={d.toISOString()}
              onClick={() => areas.length > 0 && openNewEvent(new Date(d))}
              className={cn(
                "group flex min-h-0 cursor-pointer flex-col gap-0.5 overflow-y-auto bg-[#07070e] transition-colors hover:bg-white/[0.04]",
                "p-0.5 md:p-1.5",
                !inMonth && "opacity-30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[10px] md:text-[11px]",
                  isToday
                    ? "flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] md:h-5 md:w-5"
                    : "text-[var(--color-text-faint)]",
                )}>
                  {d.getDate()}
                </span>
                {/* Botón + visible siempre en móvil, solo en hover en desktop */}
                {areas.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openNewEvent(new Date(d));
                    }}
                    title="Añadir tarea"
                    className="flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] md:hidden md:group-hover:flex"
                  >
                    <Plus size={9} />
                  </button>
                )}
              </div>
              {items.slice(0, 2).map((task) => (
                <button
                  key={task.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/areas/${task.areaId}`);
                  }}
                  title={task.title}
                  className={cn(
                    "flex w-full items-center gap-0.5 truncate rounded px-0.5 py-0.5 text-left text-[9px] hover:bg-[var(--color-surface-2)] md:gap-1 md:px-1 md:text-[11px]",
                    task.status === "completada" && "line-through opacity-50",
                  )}
                >
                  <PriorityDot priority={task.priority} />
                  <span className="truncate">{task.title}</span>
                </button>
              ))}
              {items.length > 2 && (
                <span className="px-0.5 text-[9px] text-[var(--color-text-faint)] md:px-1 md:text-[10px]">
                  +{items.length - 2}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
