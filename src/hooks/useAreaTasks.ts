"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { TaskDTO, TaskPriority, TaskStatus } from "@/lib/board/types";

/*
 * Suscripción Realtime al tablero de un área (S3-T04). Postgres Changes sobre
 * `tasks` filtrado por area_id; RLS garantiza solo filas del workspace. El
 * estado es el set PLANO de tareas no archivadas; el tablero/lista/subárbol se
 * derivan en memoria.
 */
type RealtimeRow = {
  id: string;
  area_id: string;
  client_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_user_id: string | null;
  due_date: string | null;
  position: string;
  source_message_id: string | null;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
};

function rowToDTO(r: RealtimeRow): TaskDTO {
  return {
    id: r.id,
    areaId: r.area_id,
    clientId: r.client_id,
    parentId: r.parent_id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    assigneeUserId: r.assignee_user_id,
    dueDate: r.due_date,
    position: Number(r.position),
    sourceMessageId: r.source_message_id,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  };
}

export function useAreaTasks(areaId: string, initial: TaskDTO[]) {
  const [taskMap, setTaskMap] = useState<Map<string, TaskDTO>>(
    () => new Map(initial.map((t) => [t.id, t])),
  );

  useEffect(() => {
    setTaskMap(new Map(initial.map((t) => [t.id, t])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

  const upsert = useCallback((dto: TaskDTO) => {
    setTaskMap((prev) => {
      // Las tareas archivadas desaparecen del tablero.
      const next = new Map(prev);
      next.set(dto.id, dto);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setTaskMap((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handlers = useRef({ upsert, remove });
  handlers.current = { upsert, remove };

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`area-tasks:${areaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `area_id=eq.${areaId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string };
            if (old?.id) handlers.current.remove(old.id);
            return;
          }
          const row = payload.new as RealtimeRow | undefined;
          if (!row) return;
          if (row.archived_at) handlers.current.remove(row.id);
          else handlers.current.upsert(rowToDTO(row));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [areaId]);

  const tasks = Array.from(taskMap.values());
  return { tasks, upsert, remove };
}
