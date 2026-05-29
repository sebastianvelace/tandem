"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Building2, Search } from "lucide-react";
import type { Client } from "@/db/schema";
import { ClientForm } from "./ClientForm";

/*
 * Directorio de clientes (CLI-01..05/10). Lista con alta inline y filtro
 * activo/inactivo. Cada fila abre la ficha (CLI-06/08).
 */
export function ClientDirectory({ initial }: { initial: Client[] }) {
  const t = useTranslations("clients");
  const [clients, setClients] = useState<Client[]>(initial);
  const [showInactive, setShowInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = clients.filter(
    (c) =>
      (showInactive || c.isActive) &&
      (q === "" ||
        [c.name, c.company, c.email]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))),
  );

  return (
    <div className="mx-auto h-full w-full max-w-4xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="h-8 w-48 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            {t("showInactive")}
          </label>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-bg)] hover:bg-[var(--color-accent-hover)]"
          >
            <Plus size={15} />
            {t("new")}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-faint)]">
          {t("empty")}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]">
          {visible.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                  <Building2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-[var(--color-text-faint)]">
                    {[c.company, c.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {!c.isActive && (
                  <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-text-faint)]">
                    {t("inactive")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <ClientForm
          onClose={() => setCreating(false)}
          onSaved={(c) => setClients((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}
    </div>
  );
}
