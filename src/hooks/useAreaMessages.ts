"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { MessageDTO, RootMessageDTO } from "@/lib/chat/types";

/*
 * Suscripción Realtime al chat de un área (MSG-07, S2-T02).
 * Postgres Changes sobre `messages` filtrado por area_id; RLS garantiza que
 * solo llegan filas del workspace del usuario (ADR-004). El payload trae las
 * columnas en snake_case; las normalizamos a MessageDTO.
 */

type RealtimeRow = {
  id: string;
  area_id: string;
  parent_message_id: string | null;
  author_user_id: string;
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export function rowToDTO(r: RealtimeRow): MessageDTO {
  return {
    id: r.id,
    areaId: r.area_id,
    parentMessageId: r.parent_message_id,
    authorUserId: r.author_user_id,
    body: r.deleted_at ? "" : r.body,
    editedAt: r.edited_at,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
  };
}

export function useAreaMessages(areaId: string, initial: RootMessageDTO[]) {
  const [messages, setMessages] = useState<RootMessageDTO[]>(initial);

  // Reemplaza el estado cuando cambia el área (navegación entre áreas).
  useEffect(() => {
    setMessages(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

  /** Inserta o reemplaza un mensaje raíz (dedup por id), manteniendo orden. */
  const upsertRoot = useCallback((dto: MessageDTO, replyCount = 0) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === dto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx]!, ...dto };
        return next;
      }
      const root: RootMessageDTO = { ...dto, replyCount, hasTask: false };
      return [...prev, root].sort((a, b) =>
        a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
      );
    });
  }, []);

  /** Quita un mensaje optimista por su id temporal. */
  const removeRoot = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const bumpReplyCount = useCallback((parentId: string, delta: number) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === parentId
          ? { ...m, replyCount: Math.max(0, m.replyCount + delta) }
          : m,
      ),
    );
  }, []);

  const markHasTask = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, hasTask: true } : m)),
    );
  }, []);

  // Mantenemos refs de los handlers para no re-suscribir en cada render.
  const handlers = useRef({ upsertRoot, bumpReplyCount });
  handlers.current = { upsertRoot, bumpReplyCount };

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`area-messages:${areaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `area_id=eq.${areaId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as RealtimeRow | undefined;
          if (!row) return;
          const dto = rowToDTO(row as RealtimeRow);

          if (dto.parentMessageId) {
            // Respuesta de hilo: solo afecta el contador del raíz.
            if (payload.eventType === "INSERT") {
              handlers.current.bumpReplyCount(dto.parentMessageId, 1);
            }
            return;
          }
          // Mensaje raíz: alta o edición/borrado lógico.
          handlers.current.upsertRoot(dto);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [areaId]);

  return { messages, upsertRoot, removeRoot, bumpReplyCount, markHasTask };
}
