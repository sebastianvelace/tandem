"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createClientAction,
  updateClientAction,
} from "@/server/actions/clients";
import type { Client } from "@/db/schema";

/*
 * Modal de alta/edición de cliente (CLI-01..05). Reutilizable: si recibe
 * `client` edita; si no, crea.
 */
export function ClientForm({
  client,
  onClose,
  onSaved,
}: {
  client?: Client;
  onClose: () => void;
  onSaved: (c: Client) => void;
}) {
  const t = useTranslations("clients");
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [isActive, setIsActive] = useState(client?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const payload = { name, email, company, phone, notes, isActive };
    const res = client
      ? await updateClientAction({ id: client.id, ...payload })
      : await createClientAction(payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onSaved(res.data as Client);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="text-sm font-semibold">
            {client ? t("edit") : t("new")}
          </h2>
          <button onClick={onClose} aria-label={t("close")} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field label={t("name")}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("email")}>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label={t("phone")}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label={t("company")}>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
          </Field>
          <Field label={t("notes")}>
            <textarea value={notes} rows={3} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t("active")}
          </label>
          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !name.trim()}>
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
