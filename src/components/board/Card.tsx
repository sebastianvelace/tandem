"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  GripVertical,
  ListTree,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import type { TaskDTO, TaskStatus } from "@/lib/board/types";
import type { MemberLite, ClientLite } from "@/lib/chat/types";
import { Avatar } from "@/components/chat/Avatar";
import { PriorityDot } from "./PriorityChip";

const TASK_STATUSES: TaskStatus[] = ["por_hacer", "en_proceso", "completada"];
const SWIPE_THRESHOLD = 72;

const STATUS_COLOR: Record<TaskStatus, string> = {
  por_hacer: "rgba(240,244,255,0.35)",
  en_proceso: "#f59e0b",
  completada: "#34d399",
};

export function Card({
  task,
  member,
  client,
  progress,
  onOpen,
  onStatusChange,
}: {
  task: TaskDTO;
  member: MemberLite | undefined;
  client: ClientLite | undefined;
  progress: { total: number; completed: number };
  onOpen: () => void;
  onStatusChange?: (task: TaskDTO, newStatus: TaskStatus) => void;
}) {
  const t = useTranslations("board");
  const ts = useTranslations("task");
  const locale = useLocale() as Locale;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const startX = useRef(0);
  const isPointerDown = useRef(false);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition: swiping ? undefined : transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const statusIdx = TASK_STATUSES.indexOf(task.status);
  const nextStatus = statusIdx < TASK_STATUSES.length - 1 ? TASK_STATUSES[statusIdx + 1] : null;
  const prevStatus = statusIdx > 0 ? TASK_STATUSES[statusIdx - 1] : null;

  const overdue =
    task.dueDate &&
    task.status !== "completada" &&
    new Date(task.dueDate) < new Date();

  const swipeRatio = Math.min(Math.abs(swipeDelta) / SWIPE_THRESHOLD, 1);
  const swipingRight = swipeDelta > 8;
  const swipingLeft = swipeDelta < -8;
  const swipeActivated = swipeRatio >= 1;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-drag-handle]")) return;
    startX.current = e.clientX;
    isPointerDown.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isPointerDown.current) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 6) {
      setSwiping(true);
      setSwipeDelta(
        Math.max(-SWIPE_THRESHOLD * 1.25, Math.min(SWIPE_THRESHOLD * 1.25, delta)),
      );
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD && onStatusChange) {
      if (delta > 0 && nextStatus) onStatusChange(task, nextStatus);
      else if (delta < 0 && prevStatus) onStatusChange(task, prevStatus);
    } else if (Math.abs(delta) < 6) {
      onOpen();
    }
    setSwipeDelta(0);
    setSwiping(false);
  }

  function onPointerCancel() {
    isPointerDown.current = false;
    setSwipeDelta(0);
    setSwiping(false);
  }

  const accentColor = STATUS_COLOR[task.status];

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      {...attributes}
      className={cn(
        "glass-sm group relative overflow-hidden rounded-[var(--radius)]",
        "border border-white/[0.08] bg-white/[0.04]",
        "shadow-[0_2px_12px_rgba(0,0,0,0.4)]",
        "transition-all duration-150",
        "hover:border-white/[0.14] hover:bg-white/[0.07] hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
        isDragging && "shadow-[0_8px_32px_rgba(0,0,0,0.6)] ring-1 ring-white/20",
        task.status === "completada" && "opacity-60",
      )}
    >
      {/* Borde izquierdo de estado */}
      <div
        className="absolute inset-y-0 left-0 w-[2px] rounded-l-[var(--radius)]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Overlay swipe derecha */}
      {swiping && swipingRight && nextStatus && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center gap-1.5 pl-5"
          style={{
            background: `linear-gradient(90deg, ${STATUS_COLOR[nextStatus]}22 0%, transparent 70%)`,
            opacity: swipeRatio,
          }}
        >
          <ChevronRight size={14} style={{ color: STATUS_COLOR[nextStatus] }} />
          <span className="text-xs font-medium" style={{ color: STATUS_COLOR[nextStatus] }}>
            {ts(`status.${nextStatus}`)}
          </span>
        </div>
      )}

      {/* Overlay swipe izquierda */}
      {swiping && swipingLeft && prevStatus && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-end gap-1.5 pr-5"
          style={{
            background: `linear-gradient(270deg, ${STATUS_COLOR[prevStatus]}22 0%, transparent 70%)`,
            opacity: swipeRatio,
          }}
        >
          <span className="text-xs font-medium" style={{ color: STATUS_COLOR[prevStatus] }}>
            {ts(`status.${prevStatus}`)}
          </span>
          <ChevronLeft size={14} style={{ color: STATUS_COLOR[prevStatus] }} />
        </div>
      )}

      {/* Flash al activar umbral */}
      {swipeActivated && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[var(--radius)]"
          style={{
            boxShadow: `inset 0 0 0 1.5px ${swipingRight ? (nextStatus ? STATUS_COLOR[nextStatus] : "transparent") : prevStatus ? STATUS_COLOR[prevStatus] : "transparent"}`,
          }}
        />
      )}

      {/* Contenido deslizable */}
      <div
        className="flex items-stretch pl-3"
        style={{
          transform: `translateX(${swipeDelta * 0.38}px)`,
          transition: swiping ? "none" : "transform 0.18s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="min-w-0 flex-1 cursor-pointer select-none py-3 pr-2">
          <div className="flex items-start gap-2">
            <PriorityDot priority={task.priority} />
            <p className={cn(
              "min-w-0 flex-1 text-sm leading-snug text-[var(--color-text)]",
              task.status === "completada" && "text-[var(--color-text-muted)] line-through",
            )}>
              {task.title}
            </p>
          </div>

          {progress.total > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.completed / progress.total) * 100}%`,
                    backgroundColor: progress.completed === progress.total
                      ? STATUS_COLOR.completada
                      : accentColor,
                  }}
                />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-text-faint)]">
                <ListTree size={10} className="mr-0.5 inline" />
                {progress.completed}/{progress.total}
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {task.dueDate && (
              <span className={cn(
                "inline-flex items-center gap-1 text-xs",
                overdue
                  ? "font-medium text-[var(--color-priority-alta)]"
                  : "text-[var(--color-text-faint)]",
              )}>
                <CalendarClock size={10} />
                {formatDate(task.dueDate, locale)}
              </span>
            )}
            {client && (
              <span className="inline-flex max-w-[9rem] items-center gap-1 truncate text-xs text-[var(--color-text-faint)]">
                <GitBranch size={10} />
                {client.name}
              </span>
            )}
            {task.sourceMessageId && (
              <span className="text-[var(--color-text-faint)]" title={t("fromMessage")}>
                <MessageSquare size={10} />
              </span>
            )}
          </div>
        </div>

        {/* Avatar + handle */}
        <div className="flex flex-col items-center justify-between py-2 pr-2 pl-1">
          {member ? <Avatar member={member} size={20} /> : <span />}
          <div
            data-drag-handle
            {...listeners}
            className="cursor-grab touch-none rounded p-0.5 text-[var(--color-text-faint)] opacity-0 transition-opacity duration-100 group-hover:opacity-50 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
