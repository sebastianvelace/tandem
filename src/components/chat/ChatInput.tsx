"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Input de chat (MSG-02): Enter envía, Shift+Enter salto de línea.
 * Crece con el contenido hasta un máximo. No envía vacío.
 */
export function ChatInput({
  placeholder,
  onSend,
  autoFocus,
}: {
  placeholder?: string;
  onSend: (body: string) => void | Promise<void>;
  autoFocus?: boolean;
}) {
  const t = useTranslations("chat");
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function submit() {
    const body = value.trim();
    if (!body) return;
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
    await onSend(body);
  }

  return (
    <div className="flex items-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        rows={1}
        placeholder={placeholder ?? t("placeholder")}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        className="max-h-40 flex-1 resize-none rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!value.trim()}
        aria-label={t("send")}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] transition-colors",
          value.trim()
            ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-text-faint)]",
        )}
      >
        <SendHorizonal size={16} />
      </button>
    </div>
  );
}
