"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import type {
  ClientLite,
  MemberLite,
  MessageDTO,
  RootMessageDTO,
} from "@/lib/chat/types";
import {
  sendMessageAction,
  editMessageAction,
  deleteMessageAction,
} from "@/server/actions/messages";
import { useAreaMessages } from "@/hooks/useAreaMessages";
import { MessageItem } from "./MessageItem";
import { ChatInput } from "./ChatInput";
import { ThreadPanel } from "./ThreadPanel";
import { CreateTaskFromMessage } from "./CreateTaskFromMessage";

/*
 * Panel de chat de un área (S2-T02/T03). Lista de mensajes raíz en tiempo real,
 * input, apertura de hilo y conversión mensaje→tarea. La autorización vive en
 * las Server Actions; aquí solo se orquesta UI + Realtime.
 */
export function ChatPanel({
  areaId,
  areaName,
  currentUserId,
  members,
  clients,
  initialMessages,
}: {
  areaId: string;
  areaName: string;
  currentUserId: string;
  members: MemberLite[];
  clients: ClientLite[];
  initialMessages: RootMessageDTO[];
}) {
  const t = useTranslations("chat");
  const locale = useLocale() as Locale;
  const { messages, upsertRoot, markHasTask } = useAreaMessages(
    areaId,
    initialMessages,
  );

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const [threadParent, setThreadParent] = useState<MessageDTO | null>(null);
  const [taskFor, setTaskFor] = useState<MessageDTO | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(messages.length);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Autoscroll si entró un mensaje nuevo o estamos cerca del fondo.
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (messages.length > lastCountRef.current || nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
    lastCountRef.current = messages.length;
  }, [messages]);

  async function send(body: string) {
    const res = await sendMessageAction({ areaId, body });
    if (res.ok) upsertRoot(res.data, 0);
  }

  async function edit(id: string, body: string) {
    const res = await editMessageAction({ id, body });
    if (res.ok) upsertRoot(res.data);
  }

  async function remove(id: string) {
    const res = await deleteMessageAction({ id });
    if (res.ok) {
      upsertRoot(res.data);
      if (threadParent?.id === id) setThreadParent(null);
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-5">
          <span className="text-sm font-medium">{areaName}</span>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-3">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-faint)]">
              {t("empty")}
            </div>
          ) : (
            messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                author={memberMap.get(m.authorUserId)}
                isOwn={m.authorUserId === currentUserId}
                locale={locale}
                replyCount={m.replyCount}
                hasTask={m.hasTask}
                onOpenThread={() => setThreadParent(m)}
                onCreateTask={() => setTaskFor(m)}
                onEdit={edit}
                onDelete={remove}
              />
            ))
          )}
        </div>

        <ChatInput placeholder={t("placeholderArea", { area: areaName })} onSend={send} />
      </div>

      {threadParent && (
        <ThreadPanel
          areaId={areaId}
          parent={threadParent}
          members={memberMap}
          currentUserId={currentUserId}
          locale={locale}
          onClose={() => setThreadParent(null)}
        />
      )}

      {taskFor && (
        <CreateTaskFromMessage
          message={taskFor}
          members={members}
          clients={clients}
          onClose={() => setTaskFor(null)}
          onCreated={(id) => markHasTask(id)}
        />
      )}
    </div>
  );
}
