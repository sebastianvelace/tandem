import { useTranslations } from "next-intl";
import type { TaskPriority } from "@/lib/board/types";

/*
 * Indicador de prioridad por color (UX-05): alta=coral, media=ámbar, baja=gris.
 */
const COLOR: Record<TaskPriority, string> = {
  alta: "var(--color-priority-alta)",
  media: "var(--color-priority-media)",
  baja: "var(--color-priority-baja)",
};

export function PriorityDot({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: COLOR[priority] }}
    />
  );
}

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  const t = useTranslations("task");
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
      <PriorityDot priority={priority} />
      {t(`priority.${priority}`)}
    </span>
  );
}
