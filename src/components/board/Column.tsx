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

/*
 * Columna del tablero (BRD-01): zona soltable + lista ordenable de tarjetas
 * raíz + creación rápida (BRD-09). El id de la zona es `col:<status>`.
 */
export function Column({
  status,
  tasks,
  memberMap,
  clientMap,
  progressFor,
  onOpenTask,
  onQuickAdd,
  openAddSignal,
}: {
  status: TaskStatus;
  tasks: TaskDTO[];
  memberMap: Map<string, MemberLite>;
  clientMap: Map<string, ClientLite>;
  progressFor: (id: string) => { total: number; completed: number };
  onOpenTask: (t: TaskDTO) => void;
  onQuickAdd: (status: TaskStatus, title: string) => void;
  openAddSignal?: number;
}) {
  const t = useTranslations("task");
  const tb = useTranslations("board");
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  // Atajo "N": abrir el alta rápida de esta columna (solo si recibe la señal).
  useEffect(() => {
    if (openAddSignal && openAddSignal > 0) setAdding(true);
  }, [openAddSignal]);

  function submit() {
    const title = value.trim();
    if (title) onQuickAdd(status, title);
    setValue("");
    setAdding(false);
  }

  return (
    <div className="flex min-h-0 w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {t(`status.${status}`)}
        </span>
        <span className="text-xs text-[var(--color-text-faint)]">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-[var(--radius)] p-1 transition-colors",
          isOver && "bg-[var(--color-surface)]",
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
              member={
                task.assigneeUserId
                  ? memberMap.get(task.assigneeUserId)
                  : undefined
              }
              client={task.clientId ? clientMap.get(task.clientId) : undefined}
              progress={progressFor(task.id)}
              onOpen={() => onOpenTask(task)}
            />
          ))}
        </SortableContext>

        {adding ? (
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
            className="resize-none rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-[var(--radius)] px-2 py-1.5 text-xs text-[var(--color-text-faint)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          >
            <Plus size={14} />
            {tb("addTask")}
          </button>
        )}
      </div>
    </div>
  );
}
