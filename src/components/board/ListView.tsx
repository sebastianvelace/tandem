"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import type { TaskDTO, TaskStatus } from "@/lib/board/types";
import type { ClientLite, MemberLite } from "@/lib/chat/types";
import type { UpdateTaskInput } from "@/lib/zod/task";
import { PriorityDot } from "./PriorityChip";

/*
 * Vista lista (LIST-01..05): tabla ordenable por cabecera, cambio de estado
 * inline. Comparte el set de tareas raíz ya filtrado con el tablero.
 */
type SortKey = "title" | "status" | "priority" | "dueDate";
const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 } as const;
const STATUS_RANK = { por_hacer: 0, en_proceso: 1, completada: 2 } as const;

export function ListView({
  tasks,
  memberMap,
  clientMap,
  onOpenTask,
  onUpdate,
}: {
  tasks: TaskDTO[];
  memberMap: Map<string, MemberLite>;
  clientMap: Map<string, ClientLite>;
  onOpenTask: (t: TaskDTO) => void;
  onUpdate: (input: UpdateTaskInput) => void;
}) {
  const t = useTranslations("board");
  const tt = useTranslations("task");
  const locale = useLocale() as Locale;
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [asc, setAsc] = useState(true);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const sorted = [...tasks].sort((a, b) => {
    let r = 0;
    switch (sortKey) {
      case "title":
        r = a.title.localeCompare(b.title);
        break;
      case "status":
        r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        break;
      case "priority":
        r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        break;
      case "dueDate":
        r = (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
        break;
    }
    return asc ? r : -r;
  });

  return (
    <div className="h-full overflow-auto p-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-faint)]">
            <Th label={t("colTitle")} active={sortKey === "title"} asc={asc} onClick={() => toggleSort("title")} />
            <Th label={t("statusLabel")} active={sortKey === "status"} asc={asc} onClick={() => toggleSort("status")} />
            <Th label={t("priority")} active={sortKey === "priority"} asc={asc} onClick={() => toggleSort("priority")} />
            <th className="px-3 py-2 font-medium">{t("assignee")}</th>
            <th className="px-3 py-2 font-medium">{t("client")}</th>
            <Th label={t("dueDate")} active={sortKey === "dueDate"} asc={asc} onClick={() => toggleSort("dueDate")} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => {
            const member = task.assigneeUserId
              ? memberMap.get(task.assigneeUserId)
              : undefined;
            const client = task.clientId
              ? clientMap.get(task.clientId)
              : undefined;
            return (
              <tr
                key={task.id}
                className="cursor-pointer border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                onClick={() => onOpenTask(task)}
              >
                <td className="px-3 py-2">{task.title}</td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={(e) =>
                      onUpdate({ id: task.id, status: e.target.value as TaskStatus })
                    }
                    className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-1.5 py-1 text-xs focus:outline-none"
                  >
                    {(["por_hacer", "en_proceso", "completada"] as const).map((s) => (
                      <option key={s} value={s}>
                        {tt(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <PriorityDot priority={task.priority} />
                    {tt(`priority.${task.priority}`)}
                  </span>
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">
                  {member ? member.name ?? member.email : "—"}
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">
                  {client ? client.name : "—"}
                </td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">
                  {task.dueDate ? formatDate(task.dueDate, locale) : "—"}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-[var(--color-text-faint)]">
                {t("emptyBoard")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className="cursor-pointer select-none px-3 py-2 font-medium hover:text-[var(--color-text)]"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (asc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </span>
    </th>
  );
}
