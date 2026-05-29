"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArchiveRestore, Search, Trash2 } from "lucide-react";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import type { TaskPriority, TaskStatus } from "@/lib/board/types";
import type { ClientLite, MemberLite } from "@/lib/chat/types";
import {
  deleteArchivedTaskAction,
  unarchiveTaskAction,
} from "@/server/actions/archive";
import { PriorityDot } from "@/components/board/PriorityChip";

/*
 * Vista global de Archivo (ARC-03/04). Filtros por área/cliente/responsable y
 * búsqueda por título; restaurar o eliminar permanentemente cada tarea.
 */
export type ArchiveRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  areaId: string;
  areaName: string;
  clientName: string | null;
  assigneeName: string | null;
  archivedAt: string | null;
};

export function ArchiveView({
  rows: initial,
  areas,
  members,
  clients,
}: {
  rows: ArchiveRow[];
  areas: { id: string; name: string }[];
  members: MemberLite[];
  clients: ClientLite[];
}) {
  const t = useTranslations("archive");
  const tt = useTranslations("task");
  const locale = useLocale() as Locale;
  const [rows, setRows] = useState(initial);
  const [areaId, setAreaId] = useState("");
  const [clientId, setClientId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!areaId || r.areaId === areaId) &&
        (!clientId ||
          (clientId === "__none__"
            ? r.clientName === null
            : r.clientName ===
              clients.find((c) => c.id === clientId)?.name)) &&
        (!assignee ||
          r.assigneeName === members.find((m) => m.id === assignee)?.name) &&
        (q === "" || r.title.toLowerCase().includes(q)),
    );
  }, [rows, areaId, clientId, assignee, query, clients, members]);

  async function restore(id: string) {
    const res = await unarchiveTaskAction({ id });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }
  async function remove(id: string) {
    const res = await deleteArchivedTaskAction({ id });
    if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="mx-auto h-full w-full max-w-4xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold">{t("title")}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={areaId} onChange={setAreaId} placeholder={t("allAreas")}
          options={areas.map((a) => ({ value: a.id, label: a.name }))} />
        <Select value={clientId} onChange={setClientId} placeholder={t("allClients")}
          options={[{ value: "__none__", label: t("noClient") }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
        <Select value={assignee} onChange={setAssignee} placeholder={t("allAssignees")}
          options={members.map((m) => ({ value: m.id, label: m.name ?? m.email }))} />
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")}
            className="h-7 w-44 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] pl-7 pr-2 text-xs focus:outline-none" />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-[var(--color-text-faint)]">
          {t("empty")}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]">
          {visible.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <PriorityDot priority={r.priority} />
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
              <Link href={`/areas/${r.areaId}`} className="hidden text-xs text-[var(--color-text-faint)] hover:underline sm:inline">
                {r.areaName}
              </Link>
              <span className="hidden text-xs text-[var(--color-text-faint)] md:inline">
                {tt(`status.${r.status}`)}
              </span>
              <span className="hidden text-xs text-[var(--color-text-faint)] lg:inline">
                {r.archivedAt ? formatDate(r.archivedAt, locale) : ""}
              </span>
              <button onClick={() => void restore(r.id)} aria-label={t("restore")} title={t("restore")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]">
                <ArchiveRestore size={14} />
              </button>
              <button onClick={() => void remove(r.id)} aria-label={t("deletePermanent")} title={t("deletePermanent")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-priority-alta)]">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-2 text-xs focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
