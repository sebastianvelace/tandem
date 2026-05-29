"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Client } from "@/db/schema";
import type { TaskPriority, TaskStatus } from "@/lib/board/types";
import {
  deleteClientAction,
  updateClientAction,
} from "@/server/actions/clients";
import { PriorityDot } from "@/components/board/PriorityChip";
import { ClientForm } from "./ClientForm";

/*
 * Ficha de cliente (CLI-06/08/09): datos + tareas vinculadas de TODAS las áreas
 * agrupadas por área. Permite editar, activar/desactivar y eliminar.
 */
export type ClientTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  areaId: string;
  areaName: string;
  archived: boolean;
};

export function ClientDetail({
  client: initial,
  tasks,
}: {
  client: Client;
  tasks: ClientTaskRow[];
}) {
  const t = useTranslations("clients");
  const tt = useTranslations("task");
  const router = useRouter();
  const [client, setClient] = useState(initial);
  const [editing, setEditing] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, { areaName: string; rows: ClientTaskRow[] }>();
    for (const task of tasks) {
      const g = map.get(task.areaId);
      if (g) g.rows.push(task);
      else map.set(task.areaId, { areaName: task.areaName, rows: [task] });
    }
    return [...map.entries()];
  }, [tasks]);

  async function toggleActive() {
    const res = await updateClientAction({ id: client.id, isActive: !client.isActive });
    if (res.ok) setClient(res.data as Client);
  }

  async function remove() {
    const res = await deleteClientAction({ id: client.id });
    if (res.ok) router.push("/clients");
  }

  return (
    <div className="mx-auto h-full w-full max-w-3xl px-6 py-6">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
        <ArrowLeft size={13} />
        {t("title")}
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <div className="mt-1 space-y-0.5 text-sm text-[var(--color-text-muted)]">
            {client.company && <p>{client.company}</p>}
            {client.email && <p>{client.email}</p>}
            {client.phone && <p>{client.phone}</p>}
            {!client.isActive && (
              <span className="inline-block rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] text-[var(--color-text-faint)]">
                {t("inactive")}
              </span>
            )}
          </div>
          {client.notes && (
            <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm text-[var(--color-text)]">
              {client.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleActive} className="rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]">
            {client.isActive ? t("deactivate") : t("activate")}
          </button>
          <button onClick={() => setEditing(true)} aria-label={t("edit")} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]">
            <Pencil size={15} />
          </button>
          <button onClick={() => void remove()} aria-label={t("delete")} className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-priority-alta)]">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
        {t("linkedTasks")}
      </h2>
      {grouped.length === 0 ? (
        <p className="text-sm text-[var(--color-text-faint)]">{t("noLinkedTasks")}</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([areaId, g]) => (
            <div key={areaId}>
              <Link href={`/areas/${areaId}`} className="text-sm font-medium text-[var(--color-accent-hover)] hover:underline">
                {g.areaName}
              </Link>
              <ul className="mt-1 divide-y divide-[var(--color-border)] rounded-[var(--radius)] border border-[var(--color-border)]">
                {g.rows.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <PriorityDot priority={task.priority} />
                    <span className={task.status === "completada" ? "text-[var(--color-text-muted)] line-through" : ""}>
                      {task.title}
                    </span>
                    <span className="ml-auto text-xs text-[var(--color-text-faint)]">
                      {tt(`status.${task.status}`)}
                      {task.archived ? ` · ${t("archived")}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ClientForm
          client={client}
          onClose={() => setEditing(false)}
          onSaved={(c) => setClient(c)}
        />
      )}
    </div>
  );
}
