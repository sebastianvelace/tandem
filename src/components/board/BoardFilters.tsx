"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/board/types";
import type { ClientLite, MemberLite } from "@/lib/chat/types";
import {
  type BoardFilters as Filters,
  EMPTY_FILTERS,
  hasActiveFilters,
} from "@/lib/board/selectors";

/*
 * Filtros del tablero (BRD-03/04/05): prioridad (multi), responsable (multi +
 * sin asignar) y cliente. El filtro de cliente ya es funcional aquí; en
 * Sprint 4 se enriquece la lista de clientes.
 */
const PRIORITIES: TaskPriority[] = ["alta", "media", "baja"];

export function BoardFilters({
  filters,
  setFilters,
  members,
  clients,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  members: MemberLite[];
  clients: ClientLite[];
}) {
  const t = useTranslations("task");
  const tb = useTranslations("board");

  function togglePriority(p: TaskPriority) {
    const has = filters.priorities.includes(p);
    setFilters({
      ...filters,
      priorities: has
        ? filters.priorities.filter((x) => x !== p)
        : [...filters.priorities, p],
    });
  }

  function toggleAssignee(id: string) {
    const has = filters.assignees.includes(id);
    setFilters({
      ...filters,
      assignees: has
        ? filters.assignees.filter((x) => x !== id)
        : [...filters.assignees, id],
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterGroup label={tb("priority")}>
        {PRIORITIES.map((p) => (
          <Chip
            key={p}
            active={filters.priorities.includes(p)}
            onClick={() => togglePriority(p)}
          >
            {t(`priority.${p}`)}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label={tb("assignee")}>
        {members.map((m) => (
          <Chip
            key={m.id}
            active={filters.assignees.includes(m.id)}
            onClick={() => toggleAssignee(m.id)}
          >
            {m.name ?? m.email}
          </Chip>
        ))}
        <Chip
          active={filters.unassigned}
          onClick={() =>
            setFilters({ ...filters, unassigned: !filters.unassigned })
          }
        >
          {tb("unassigned")}
        </Chip>
      </FilterGroup>

      <select
        value={filters.clientId ?? ""}
        onChange={(e) =>
          setFilters({ ...filters, clientId: e.target.value || null })
        }
        className="h-7 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-2 text-xs focus:outline-none"
      >
        <option value="">{tb("allClients")}</option>
        <option value="__none__">{tb("noClient")}</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {hasActiveFilters(filters) && (
        <button
          onClick={() => setFilters(EMPTY_FILTERS)}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
        >
          <X size={12} />
          {tb("clearFilters")}
        </button>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-[var(--color-text-faint)]">{label}:</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-0.5 text-xs transition-colors",
        active
          ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}
