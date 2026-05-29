"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { listThreadAction } from "@/server/actions/messages";
import type { MessageDTO } from "@/lib/chat/types";
import { rowToDTO } from "./useAreaMessages";

/*
 * Carga + Realtime de las respuestas de un hilo (TH-01..03).
 * Se suscribe a Postgres Changes filtrando por parent_message_id.
 */
export function useThreadReplies(parentMessageId: string) {
  const [replies, setReplies] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const upsert = useCallback((dto: MessageDTO) => {
    setReplies((prev) => {
      const idx = prev.findIndex((m) => m.id === dto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx]!, ...dto };
        return next;
      }
      return [...prev, dto].sort((a, b) =>
        a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
      );
    });
  }, []);

  const remove = useCallback((id: string) => {
    setReplies((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Carga inicial.
  useEffect(() => {
    let active = true;
    setLoading(true);
    listThreadAction({ parentMessageId }).then((res) => {
      if (!active) return;
      if (res.ok) setReplies(res.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [parentMessageId]);

  const upsertRef = useRef(upsert);
  upsertRef.current = upsert;

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`thread:${parentMessageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${parentMessageId}`,
        },
        (payload) => {
          const row = payload.new ?? payload.old;
          if (!row) return;
          upsertRef.current(rowToDTO(row as never));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [parentMessageId]);

  return { replies, loading, upsert, remove };
}
