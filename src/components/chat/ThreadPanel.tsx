"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { MemberLite, MessageDTO } from "@/lib/chat/types";
import {
  sendMessageAction,
  editMessageAction,
  deleteMessageAction,
} from "@/server/actions/messages";
import { useThreadReplies } from "@/hooks/useThreadReplies";
import { MessageItem } from "./MessageItem";
import { ChatInput } from "./ChatInput";

/*
 * Panel lateral derecho de un hilo (TH-01..03). Muestra el mensaje raíz y sus
 * respuestas en tiempo real; permite responder dentro del hilo.
 */
export function ThreadPanel({
  areaId,
  parent,
  members,
  currentUserId,
  locale,
  onClose,
}: {
  areaId: string;
  parent: MessageDTO;
  members: Map<string, MemberLite>;
  currentUserId: string;
  locale: Locale;
  onClose: () => void;
}) {
  const t = useTranslations("chat");
  const { replies, loading, upsert } = useThreadReplies(parent.id);

  async function sendReply(body: string) {
    const res = await sendMessageAction({
      areaId,
      body,
      parentMessageId: parent.id,
    });
    if (res.ok) upsert(res.data);
  }

  async function editReply(id: string, body: string) {
    const res = await editMessageAction({ id, body });
    if (res.ok) upsert(res.data);
  }

  async function deleteReply(id: string) {
    const res = await deleteMessageAction({ id });
    if (res.ok) {
      if (id === parent.id) onClose();
      else upsert(res.data);
    }
  }

  return (
    <aside className="flex h-full w-96 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
        <span className="text-sm font-semibold">{t("thread")}</span>
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <div className="border-b border-[var(--color-border)] pb-2">
          <MessageItem
            message={parent}
            author={members.get(parent.authorUserId)}
            isOwn={parent.authorUserId === currentUserId}
            locale={locale}
            showThreadControls={false}
            onEdit={editReply}
            onDelete={deleteReply}
          />
        </div>

        {loading ? (
          <p className="px-4 py-3 text-xs text-[var(--color-text-faint)]">
            {t("loading")}
          </p>
        ) : (
          <div className="pt-2">
            {replies.map((r) => (
              <MessageItem
                key={r.id}
                message={r}
                author={members.get(r.authorUserId)}
                isOwn={r.authorUserId === currentUserId}
                locale={locale}
                showThreadControls={false}
                onEdit={editReply}
                onDelete={deleteReply}
              />
            ))}
            {replies.length === 0 && (
              <p className="px-4 py-3 text-xs text-[var(--color-text-faint)]">
                {t("noReplies")}
              </p>
            )}
          </div>
        )}
      </div>

      <ChatInput placeholder={t("replyPlaceholder")} onSend={sendReply} />
    </aside>
  );
}
