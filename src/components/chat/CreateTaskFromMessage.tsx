"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTaskFromMessageAction } from "@/server/actions/tasks";
import type { ClientLite, MemberLite, MessageDTO } from "@/lib/chat/types";

/*
 * Modal de conversión mensaje→tarea (MSG-09..12). Prefill: título = primeros
 * ~80 caracteres del mensaje; descripción = cuerpo completo. Hereda el área del
 * mensaje (server-side). Permite elegir prioridad, responsable y cliente.
 */
const TITLE_MAX = 80;

export function CreateTaskFromMessage({
  message,
  members,
  clients,
  onClose,
  onCreated,
}: {
  message: MessageDTO;
  members: MemberLite[];
  clients: ClientLite[];
  onClose: () => void;
  onCreated: (messageId: string) => void;
}) {
  const t = useTranslations("chat");
  const tt = useTranslations("task");
  const seed = message.body.replace(/\s+/g, " ").trim();
  const [title, setTitle] = useState(seed.slice(0, TITLE_MAX));
  const [description, setDescription] = useState(message.body);
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const res = await createTaskFromMessageAction({
      sourceMessageId: message.id,
      title,
      description,
      priority,
      assigneeUserId: assigneeUserId || null,
      clientId: clientId || null,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onCreated(message.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-sm font-semibold">{t("createTaskTitle")}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <Field label={t("taskTitle")}>
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>

          <Field label={t("taskDescription")}>
            <textarea
              value={description}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={tt("priorityLabel")}>
              <Select
                value={priority}
                onChange={(v) => setPriority(v as "alta" | "media" | "baja")}
                options={[
                  { value: "alta", label: tt("priority.alta") },
                  { value: "media", label: tt("priority.media") },
                  { value: "baja", label: tt("priority.baja") },
                ]}
              />
            </Field>
            <Field label={t("assignee")}>
              <Select
                value={assigneeUserId}
                onChange={setAssigneeUserId}
                options={[
                  { value: "", label: t("unassigned") },
                  ...members.map((m) => ({
                    value: m.id,
                    label: m.name ?? m.email,
                  })),
                ]}
              />
            </Field>
            <Field label={t("client")}>
              <Select
                value={clientId}
                onChange={setClientId}
                options={[
                  { value: "", label: t("noClient") },
                  ...clients.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </Field>
          </div>

          {error && (
            <p className="text-xs text-[var(--color-danger)]">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !title.trim()}>
            {t("createTaskAction")}
          </Button>
        </div>
      </div>
    </div>
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
      className="w-full rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
