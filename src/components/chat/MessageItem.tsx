"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquare,
  Pencil,
  Trash2,
  ListPlus,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import type { MemberLite, MessageDTO } from "@/lib/chat/types";
import { MessageBody } from "./MessageBody";

/*
 * Una fila de mensaje (MSG-01..06). Muestra autor/hora, cuerpo con enlaces,
 * marcas "(editado)"/"[eliminado]" y acciones al hover. Solo el autor puede
 * editar/eliminar (MSG-04/05).
 */
export function MessageItem({
  message,
  author,
  isOwn,
  locale,
  replyCount,
  hasTask,
  showThreadControls = true,
  onOpenThread,
  onCreateTask,
  onEdit,
  onDelete,
}: {
  message: MessageDTO;
  author: MemberLite | undefined;
  isOwn: boolean;
  locale: Locale;
  replyCount?: number;
  hasTask?: boolean;
  showThreadControls?: boolean;
  onOpenThread?: () => void;
  onCreateTask?: () => void;
  onEdit: (id: string, body: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const t = useTranslations("chat");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const deleted = Boolean(message.deletedAt);
  const authorName = author?.name ?? author?.email ?? "—";

  async function saveEdit() {
    const body = draft.trim();
    if (!body || body === message.body) {
      setEditing(false);
      return;
    }
    await onEdit(message.id, body);
    setEditing(false);
  }

  return (
    <div className="group flex px-4 py-1.5 hover:bg-[var(--color-surface)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {authorName}
          </span>
          <span className="text-xs text-[var(--color-text-faint)]">
            {formatTime(message.createdAt, locale)}
          </span>
          {message.editedAt && !deleted && (
            <span className="text-xs text-[var(--color-text-faint)]">
              {t("edited")}
            </span>
          )}
          {hasTask && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              <CheckSquare size={11} />
              {t("hasTask")}
            </span>
          )}
        </div>

        {deleted ? (
          <p className="text-sm italic text-[var(--color-text-faint)]">
            {t("deleted")}
          </p>
        ) : editing ? (
          <div className="mt-1">
            <textarea
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void saveEdit();
                }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={2}
              className="w-full resize-none rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <div className="mt-1 flex gap-2 text-xs text-[var(--color-text-faint)]">
              <button
                className="hover:text-[var(--color-text)]"
                onClick={() => void saveEdit()}
              >
                {t("save")}
              </button>
              <button
                className="hover:text-[var(--color-text)]"
                onClick={() => setEditing(false)}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-[var(--color-text)]">
            <MessageBody body={message.body} />
          </div>
        )}

        {showThreadControls && !deleted && (replyCount ?? 0) > 0 && (
          <button
            onClick={onOpenThread}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent-hover)] hover:underline"
          >
            <MessageSquare size={12} />
            {t("repliesCount", { count: replyCount ?? 0 })}
          </button>
        )}
      </div>

      {/* Acciones (hover) */}
      {!deleted && !editing && (
        <div className="flex items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {showThreadControls && (
            <IconAction
              label={t("reply")}
              onClick={onOpenThread}
              icon={<MessageSquare size={14} />}
            />
          )}
          {showThreadControls && onCreateTask && (
            <IconAction
              label={t("createTask")}
              onClick={onCreateTask}
              icon={<ListPlus size={14} />}
            />
          )}
          {isOwn && (
            <>
              <IconAction
                label={t("edit")}
                onClick={() => {
                  setDraft(message.body);
                  setEditing(true);
                }}
                icon={<Pencil size={14} />}
              />
              <IconAction
                label={t("delete")}
                onClick={() => void onDelete(message.id)}
                icon={<Trash2 size={14} />}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IconAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-faint)]",
        "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
      )}
    >
      {icon}
    </button>
  );
}
