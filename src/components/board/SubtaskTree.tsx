"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "@/lib/board/types";
import { getChildren } from "@/lib/board/selectors";
import { PriorityDot } from "./PriorityChip";

/*
 * Árbol de subtareas (SUB-01..05): misma entidad (parent_id), indentado hasta
 * 3 niveles en UI (ARQ-03); más profundo se abre desde el detalle de la
 * subtarea. La jerarquía en datos es infinita.
 */
const MAX_UI_DEPTH = 3;

export function SubtaskTree({
  parentId,
  byParent,
  depth,
  onToggle,
  onAdd,
  onOpen,
}: {
  parentId: string;
  byParent: Map<string, TaskDTO[]>;
  depth: number;
  onToggle: (task: TaskDTO) => void;
  onAdd: (parentId: string, title: string) => void;
  onOpen: (task: TaskDTO) => void;
}) {
  const children = getChildren(parentId, byParent);
  const tb = useTranslations("board");

  return (
    <div className="flex flex-col">
      {children.map((task) => {
        const grandchildren = getChildren(task.id, byParent);
        const canNest = depth < MAX_UI_DEPTH;
        return (
          <div key={task.id}>
            <div className="group flex items-center gap-2 py-1">
              <button
                onClick={() => onToggle(task)}
                aria-label="toggle"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  task.status === "completada"
                    ? "border-[var(--color-success)] bg-[var(--color-success)] text-black"
                    : "border-[var(--color-border-strong)]",
                )}
              >
                {task.status === "completada" && <Check size={11} />}
              </button>
              <PriorityDot priority={task.priority} />
              <button
                onClick={() => onOpen(task)}
                className={cn(
                  "min-w-0 flex-1 truncate text-left text-sm hover:underline",
                  task.status === "completada" &&
                    "text-[var(--color-text-muted)] line-through",
                )}
              >
                {task.title}
              </button>
              {grandchildren.length > 0 && (
                <span className="text-xs text-[var(--color-text-faint)]">
                  {grandchildren.filter((g) => g.status === "completada").length}/
                  {grandchildren.length}
                </span>
              )}
            </div>

            {grandchildren.length > 0 &&
              (canNest ? (
                <div className="ml-4 border-l border-[var(--color-border)] pl-2">
                  <SubtaskTree
                    parentId={task.id}
                    byParent={byParent}
                    depth={depth + 1}
                    onToggle={onToggle}
                    onAdd={onAdd}
                    onOpen={onOpen}
                  />
                </div>
              ) : (
                <button
                  onClick={() => onOpen(task)}
                  className="ml-6 flex items-center gap-1 py-0.5 text-xs text-[var(--color-accent-hover)] hover:underline"
                >
                  <ChevronRight size={12} />
                  {tb("openToSeeMore")}
                </button>
              ))}
          </div>
        );
      })}

      <AddSubtask parentId={parentId} onAdd={onAdd} />
    </div>
  );
}

function AddSubtask({
  parentId,
  onAdd,
}: {
  parentId: string;
  onAdd: (parentId: string, title: string) => void;
}) {
  const tb = useTranslations("board");
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const title = value.trim();
    if (title) onAdd(parentId, title);
    setValue("");
    setAdding(false);
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
      >
        <Plus size={12} />
        {tb("addSubtask")}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape") {
          setValue("");
          setAdding(false);
        }
      }}
      placeholder={tb("subtaskPlaceholder")}
      className="mt-1 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
    />
  );
}
