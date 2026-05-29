"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, GitBranch, ListTree, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import type { TaskDTO } from "@/lib/board/types";
import type { MemberLite, ClientLite } from "@/lib/chat/types";
import { Avatar } from "@/components/chat/Avatar";
import { PriorityDot } from "./PriorityChip";

/*
 * Tarjeta de tarea en el tablero (BRD-02). Arrastrable (dnd-kit). Muestra
 * prioridad, responsable, fecha, progreso de subtareas y origen (chat).
 */
export function Card({
  task,
  member,
  client,
  progress,
  onOpen,
}: {
  task: TaskDTO;
  member: MemberLite | undefined;
  client: ClientLite | undefined;
  progress: { total: number; completed: number };
  onOpen: () => void;
}) {
  const t = useTranslations("board");
  const locale = useLocale() as Locale;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue =
    task.dueDate &&
    task.status !== "completada" &&
    new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        "group cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm shadow-sm",
        "hover:border-[var(--color-border-strong)]",
      )}
    >
      <div className="flex items-start gap-2">
        <PriorityDot priority={task.priority} />
        <p
          className={cn(
            "min-w-0 flex-1 leading-snug text-[var(--color-text)]",
            task.status === "completada" && "text-[var(--color-text-muted)] line-through",
          )}
        >
          {task.title}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-faint)]">
        {progress.total > 0 && (
          <span className="inline-flex items-center gap-1" title={t("subtasks")}>
            <ListTree size={12} />
            {progress.completed}/{progress.total}
          </span>
        )}
        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue && "text-[var(--color-priority-alta)]",
            )}
          >
            <CalendarClock size={12} />
            {formatDate(task.dueDate, locale)}
          </span>
        )}
        {client && (
          <span className="inline-flex items-center gap-1 truncate">
            <GitBranch size={12} />
            {client.name}
          </span>
        )}
        {task.sourceMessageId && (
          <span title={t("fromMessage")}>
            <MessageSquare size={12} />
          </span>
        )}
        <span className="ml-auto">
          {member && <Avatar member={member} size={20} />}
        </span>
      </div>
    </div>
  );
}
