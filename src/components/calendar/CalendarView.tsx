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
    <div className="flex h-full flex-col px-6 py-5">
      {/* Encabezado */}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-base font-semibold capitalize">{monthLabel}</h1>
        <div className="flex items-center gap-1">
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
            className="ml-auto flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <Plus size={13} />
            Añadir tarea
          </button>
        )}
      </div>

      {/* Modal nueva tarea */}
      {newEvent && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 animate-slide-up">
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
          <select
            value={newEvent.areaId}
            onChange={(e) => setNewEvent({ ...newEvent, areaId: e.target.value })}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs focus:outline-none"
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
          <button
            onClick={() => setNewEvent(null)}
            className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-white/[0.1] pb-1.5 text-xs text-[var(--color-text-faint)]">
        {weekdays.map((w) => (
          <div key={w} className="px-2 capitalize tracking-wide">{w}</div>
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
              className={cn(
                "group flex min-h-0 flex-col gap-0.5 overflow-y-auto bg-[#07070e] p-1.5 transition-colors hover:bg-white/[0.04]",
                !inMonth && "opacity-30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "mb-0.5 text-[11px]",
                  isToday
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : "text-[var(--color-text-faint)]",
                )}>
                  {d.getDate()}
                </span>
                {areas.length > 0 && (
                  <button
                    onClick={() => openNewEvent(new Date(d))}
                    title="Añadir tarea"
                    className="hidden h-4 w-4 items-center justify-center rounded text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] group-hover:flex"
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>
              {items.map((task) => (
                <button
                  key={task.id}
                  onClick={() => router.push(`/areas/${task.areaId}`)}
                  title={task.title}
                  className={cn(
                    "flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-[var(--color-surface-2)]",
                    task.status === "completada" && "line-through opacity-50",
                  )}
                >
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
