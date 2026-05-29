"use client";

import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskDTO, TaskStatus } from "@/lib/board/types";
import type { ClientLite, MemberLite } from "@/lib/chat/types";
import { Card } from "./Card";

const STATUS_COLOR: Record<TaskStatus, string> = {
  por_hacer: "#6b7280",
  en_proceso: "#d97706",
  completada: "#16a34a",
};

export function Column({
  status,
  tasks,
  memberMap,
  clientMap,
  progressFor,
  onOpenTask,
  onQuickAdd,
  onStatusChange,
  openAddSignal,
}: {
  status: TaskStatus;
  tasks: TaskDTO[];
  memberMap: Map<string, MemberLite>;
  clientMap: Map<string, ClientLite>;
  progressFor: (id: string) => { total: number; completed: number };
  onOpenTask: (t: TaskDTO) => void;
  onQuickAdd: (status: TaskStatus, title: string) => void;
  onStatusChange: (task: TaskDTO, newStatus: TaskStatus) => void;
  openAddSignal?: number;
}) {
  const t = useTranslations("task");
  const tb = useTranslations("board");
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (openAddSignal && openAddSignal > 0) setAdding(true);
  }, [openAddSignal]);

  function submit() {
    const title = value.trim();
    if (title) onQuickAdd(status, title);
    setValue("");
    setAdding(false);
  }

  const accentColor = STATUS_COLOR[status];

  return (
    <div className="flex min-h-0 w-72 shrink-0 flex-col">
      {/* Cabecera */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {t(`status.${status}`)}
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          style={{
            backgroundColor: `${accentColor}18`,
            color: accentColor,
          }}
        >
          {tasks.length}
        </span>
        {/* Botón de añadir tarea — en el encabezado, siempre visible */}
        <button
          onClick={() => setAdding(true)}
          title={tb("addTask")}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Formulario de añadir (aparece arriba de las tarjetas) */}
      {adding && (
        <textarea
          autoFocus
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              setValue("");
              setAdding(false);
            }
          }}
          placeholder={tb("quickAddPlaceholder")}
          className="mb-2 resize-none rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      )}

      {/* Zona droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-[var(--radius)] p-1.5 transition-colors duration-150",
          isOver && "bg-[var(--color-surface)] ring-1 ring-[var(--color-border-strong)]",
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <Card
              key={task.id}
              task={task}
              member={task.assigneeUserId ? memberMap.get(task.assigneeUserId) : undefined}
              client={task.clientId ? clientMap.get(task.clientId) : undefined}
              progress={progressFor(task.id)}
              onOpen={() => onOpenTask(task)}
              onStatusChange={onStatusChange}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !adding && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
            <span className="text-2xl opacity-20" style={{ color: accentColor }}>○</span>
            <span className="text-xs text-[var(--color-text-faint)]">{tb("emptyBoard")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
