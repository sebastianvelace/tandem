"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { TaskDTO, TaskStatus } from "@/lib/board/types";
import { TASK_STATUSES } from "@/lib/board/types";
import type { ClientLite, MemberLite } from "@/lib/chat/types";
import { Column } from "./Column";

/*
 * Tablero Kanban (BRD-01/07): 3 columnas con drag&drop entre estados y
 * reordenamiento. Calcula los vecinos del punto de inserción para que el
 * service asigne la posición fractional (ADR-008).
 */
export type MoveArgs = {
  id: string;
  status: TaskStatus;
  prevId: string | null;
  nextId: string | null;
};

export function Board({
  columns,
  memberMap,
  clientMap,
  progressFor,
  onOpenTask,
  onQuickAdd,
  onMove,
  newTaskSignal,
}: {
  columns: Record<TaskStatus, TaskDTO[]>;
  memberMap: Map<string, MemberLite>;
  clientMap: Map<string, ClientLite>;
  progressFor: (id: string) => { total: number; completed: number };
  onOpenTask: (t: TaskDTO) => void;
  onQuickAdd: (status: TaskStatus, title: string) => void;
  onMove: (args: MoveArgs) => void;
  newTaskSignal?: number;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);

  const byId = new Map<string, TaskDTO>();
  for (const status of TASK_STATUSES) {
    for (const t of columns[status]) byId.set(t.id, t);
  }

  function statusOf(overId: string): TaskStatus | null {
    if (overId.startsWith("col:")) return overId.slice(4) as TaskStatus;
    const t = byId.get(overId);
    return t ? t.status : null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveTask(byId.get(String(e.active.id)) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const targetStatus = statusOf(overId);
    if (!targetStatus) return;

    // Lista destino sin la tarea activa, en orden actual.
    const targetList = columns[targetStatus].filter((t) => t.id !== activeId);

    let insertIndex: number;
    if (overId.startsWith("col:")) {
      insertIndex = targetList.length; // soltada en zona vacía → al final
    } else {
      const idx = targetList.findIndex((t) => t.id === overId);
      insertIndex = idx < 0 ? targetList.length : idx;
    }

    const prev = insertIndex > 0 ? targetList[insertIndex - 1] : null;
    const next = insertIndex < targetList.length ? targetList[insertIndex] : null;

    // No-op: misma columna y mismos vecinos que ya tenía → no movemos.
    const current = byId.get(activeId);
    if (current && current.status === targetStatus) {
      const origin = columns[targetStatus];
      const curIdx = origin.findIndex((t) => t.id === activeId);
      const curPrev = curIdx > 0 ? origin[curIdx - 1]!.id : null;
      const curNext = curIdx < origin.length - 1 ? origin[curIdx + 1]!.id : null;
      if ((prev?.id ?? null) === curPrev && (next?.id ?? null) === curNext) {
        return;
      }
    }

    onMove({
      id: activeId,
      status: targetStatus,
      prevId: prev?.id ?? null,
      nextId: next?.id ?? null,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={columns[status]}
            memberMap={memberMap}
            clientMap={clientMap}
            progressFor={progressFor}
            onOpenTask={onOpenTask}
            onQuickAdd={onQuickAdd}
            openAddSignal={status === "por_hacer" ? newTaskSignal : undefined}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-3 text-sm shadow-lg">
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
