"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, X } from "lucide-react";
import type { TaskDTO, TaskPriority, TaskStatus } from "@/lib/board/types";
import type { ClientLite, MemberLite } from "@/lib/chat/types";
import { childrenByParent, subtaskProgress } from "@/lib/board/selectors";
import type { UpdateTaskInput } from "@/lib/zod/task";
import { SubtaskTree } from "./SubtaskTree";

/*
 * Detalle de tarea (TASK-06/07): panel derecho con todos los campos editables,
 * árbol de subtareas y origen (chat). Las ediciones se guardan al perder foco /
 * cambiar el selector (optimista en el contenedor).
 */
export function TaskDetail({
  task,
  tasks,
  members,
  clients,
  onUpdate,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onOpenTask,
  onClose,
}: {
  task: TaskDTO;
  tasks: TaskDTO[];
  members: MemberLite[];
  clients: ClientLite[];
  onUpdate: (input: UpdateTaskInput) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (t: TaskDTO) => void;
  onAddSubtask: (parentId: string, title: string) => void;
  onOpenTask: (t: TaskDTO) => void;
  onClose: () => void;
}) {
  const t = useTranslations("board");
  const tt = useTranslations("task");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.id, task.title, task.description]);

  const byParent = childrenByParent(tasks);
  const progress = subtaskProgress(task.id, byParent);

  function dueValue() {
    if (!task.dueDate) return "";
    return new Date(task.dueDate).toISOString().slice(0, 10);
  }

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
        <span className="text-sm font-semibold">{t("taskDetail")}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(task.id)}
            aria-label={t("delete")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-priority-alta)]"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <textarea
          value={title}
          rows={2}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const v = title.trim();
            if (v && v !== task.title) onUpdate({ id: task.id, title: v });
            else setTitle(task.title);
          }}
          className="w-full resize-none rounded-[var(--radius)] bg-transparent text-base font-semibold focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("statusLabel")}>
            <Select
              value={task.status}
              onChange={(v) => onUpdate({ id: task.id, status: v as TaskStatus })}
              options={(["por_hacer", "en_proceso", "completada"] as const).map(
                (s) => ({ value: s, label: tt(`status.${s}`) }),
              )}
            />
          </Field>
          <Field label={tt("priorityLabel")}>
            <Select
              value={task.priority}
              onChange={(v) =>
                onUpdate({ id: task.id, priority: v as TaskPriority })
              }
              options={(["alta", "media", "baja"] as const).map((p) => ({
                value: p,
                label: tt(`priority.${p}`),
              }))}
            />
          </Field>
          <Field label={t("assignee")}>
            <Select
              value={task.assigneeUserId ?? ""}
              onChange={(v) =>
                onUpdate({ id: task.id, assigneeUserId: v || null })
              }
              options={[
                { value: "", label: t("unassigned") },
                ...members.map((m) => ({ value: m.id, label: m.name ?? m.email })),
              ]}
            />
          </Field>
          <Field label={t("client")}>
            <Select
              value={task.clientId ?? ""}
              onChange={(v) => onUpdate({ id: task.id, clientId: v || null })}
              options={[
                { value: "", label: t("noClient") },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </Field>
          <Field label={t("dueDate")}>
            <input
              type="date"
              value={dueValue()}
              onChange={(e) =>
                onUpdate({
                  id: task.id,
                  dueDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
              className="w-full rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>
        </div>

        <Field label={t("description")}>
          <textarea
            value={description}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (task.description ?? ""))
                onUpdate({ id: task.id, description: description || null });
            }}
            className="w-full resize-none rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </Field>

        {task.sourceMessageId && (
          <p className="rounded-[var(--radius)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
            {t("fromMessageNote")}
          </p>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
              {t("subtasks")}
            </span>
            {progress.total > 0 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                {progress.completed}/{progress.total}
              </span>
            )}
          </div>
          <SubtaskTree
            parentId={task.id}
            byParent={byParent}
            depth={1}
            onToggle={onToggleSubtask}
            onAdd={onAddSubtask}
            onOpen={onOpenTask}
          />
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
