"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Filter, LayoutGrid, List, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHotkeys } from "@/lib/hotkeys";
import type { TaskDTO, TaskStatus } from "@/lib/board/types";
import type { ClientLite, MemberLite } from "@/lib/chat/types";
import {
  buildColumns,
  childrenByParent,
  type BoardFilters as Filters,
  EMPTY_FILTERS,
  rootTasks,
  passesFilters,
  sortTasks,
  subtaskProgress,
  hasActiveFilters,
  type SortMode,
} from "@/lib/board/selectors";
import type { UpdateTaskInput } from "@/lib/zod/task";
import {
  createTaskAction,
  deleteTaskAction,
  moveTaskAction,
  updateTaskAction,
} from "@/server/actions/tasks";
import { archiveTaskAction } from "@/server/actions/archive";
import { useAreaTasks } from "@/hooks/useAreaTasks";
import { Board, type MoveArgs } from "./Board";
import { ListView } from "./ListView";
import { BoardFilters } from "./BoardFilters";
import { TaskDetail } from "./TaskDetail";

function midpoint(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 1;
  if (prev === null) return next! / 2;
  if (next === null) return prev + 1;
  return (prev + next) / 2;
}

export function BoardClient({
  areaId,
  members,
  clients,
  initialTasks,
}: {
  areaId: string;
  members: MemberLite[];
  clients: ClientLite[];
  initialTasks: TaskDTO[];
}) {
  const t = useTranslations("board");
  const { tasks, upsert, remove } = useAreaTasks(areaId, initialTasks);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortMode>("manual");
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ parentId: string; label: string } | null>(null);
  const [newTaskSignal, setNewTaskSignal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useHotkeys({
    "/": (e) => {
      e.preventDefault();
      searchRef.current?.focus();
    },
    n: () => {
      setView("board");
      setNewTaskSignal((s) => s + 1);
    },
    N: () => {
      setView("board");
      setNewTaskSignal((s) => s + 1);
    },
    Escape: () => {
      if (selectedId) setSelectedId(null);
    },
  });

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );
  const byParent = useMemo(() => childrenByParent(tasks), [tasks]);
  const progressFor = (id: string) => subtaskProgress(id, byParent);

  const columns = useMemo(
    () => buildColumns(tasks, filters, sort, query),
    [tasks, filters, sort, query],
  );
  const listTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortTasks(
      rootTasks(tasks).filter(
        (t) => passesFilters(t, filters) && (q === "" || t.title.toLowerCase().includes(q)),
      ),
      sort,
    );
  }, [tasks, filters, sort, query]);

  const selected = selectedId
    ? tasks.find((t) => t.id === selectedId) ?? null
    : null;

  const activeFilters = hasActiveFilters(filters);

  async function handleCreate(input: {
    status?: TaskStatus;
    title: string;
    parentId?: string;
  }) {
    const res = await createTaskAction({ areaId, ...input });
    if (res.ok) upsert(res.data);
  }

  async function handleUpdate(input: UpdateTaskInput) {
    const prev = tasks.find((x) => x.id === input.id);
    if (prev) {
      upsert({
        ...prev,
        ...("title" in input && input.title ? { title: input.title } : {}),
        ...("status" in input && input.status ? { status: input.status } : {}),
        ...("priority" in input && input.priority ? { priority: input.priority } : {}),
        ...("assigneeUserId" in input
          ? { assigneeUserId: input.assigneeUserId ?? null }
          : {}),
        ...("clientId" in input ? { clientId: input.clientId ?? null } : {}),
        ...("description" in input ? { description: input.description ?? null } : {}),
        ...("dueDate" in input ? { dueDate: input.dueDate ?? null } : {}),
      });
    }
    const res = await updateTaskAction(input);
    if (res.ok) {
      upsert(res.data);
      maybeSuggestParent(res.data);
    } else if (prev) {
      upsert(prev);
    }
  }

  async function handleSwipeStatus(task: TaskDTO, newStatus: TaskStatus) {
    void handleUpdate({ id: task.id, status: newStatus });
  }

  async function handleMove(args: MoveArgs) {
    const current = tasks.find((x) => x.id === args.id);
    const prevPos = args.prevId
      ? tasks.find((x) => x.id === args.prevId)?.position ?? null
      : null;
    const nextPos = args.nextId
      ? tasks.find((x) => x.id === args.nextId)?.position ?? null
      : null;
    if (current) {
      upsert({ ...current, status: args.status, position: midpoint(prevPos, nextPos) });
    }
    const res = await moveTaskAction(args);
    if (res.ok) upsert(res.data);
    else if (current) upsert(current);
  }

  async function handleDelete(id: string) {
    const prev = tasks.find((x) => x.id === id);
    remove(id);
    if (selectedId === id) setSelectedId(null);
    const res = await deleteTaskAction({ id });
    if (!res.ok && prev) upsert(prev);
  }

  async function handleArchive(id: string) {
    const prev = tasks.find((x) => x.id === id);
    remove(id);
    if (selectedId === id) setSelectedId(null);
    const res = await archiveTaskAction({ id });
    if (!res.ok && prev) upsert(prev);
  }

  function handleToggleSubtask(task: TaskDTO) {
    const nextStatus: TaskStatus =
      task.status === "completada" ? "por_hacer" : "completada";
    void handleUpdate({ id: task.id, status: nextStatus });
  }

  function maybeSuggestParent(changed: TaskDTO) {
    if (!changed.parentId) return;
    const parent = tasks.find((x) => x.id === changed.parentId);
    if (!parent || parent.status === "completada") return;
    const prog = subtaskProgress(parent.id, childrenByParent(tasks));
    const total = prog.total;
    const completed =
      prog.completed + (changed.status === "completada" ? 1 : 0);
    if (total > 0 && completed >= total) {
      setToast({ parentId: parent.id, label: parent.title });
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Toolbar principal */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3 py-2">
          {/* Vista board/lista */}
          <div className="flex items-center rounded-md border border-white/[0.1]">
            <ToolbarToggle active={view === "board"} onClick={() => setView("board")}>
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">{t("board")}</span>
            </ToolbarToggle>
            <ToolbarToggle active={view === "list"} onClick={() => setView("list")}>
              <List size={14} />
              <span className="hidden sm:inline">{t("list")}</span>
            </ToolbarToggle>
          </div>

          {/* Orden */}
          <button
            onClick={() => setSort(sort === "manual" ? "priority" : "manual")}
            className="hidden rounded-md border border-white/[0.1] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-white/[0.06] hover:text-[var(--color-text)] sm:block"
          >
            {sort === "manual" ? t("orderManual") : t("orderPriority")}
          </button>

          {/* Búsqueda */}
          <div className="relative flex-1 sm:flex-none">
            <Search
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-7 w-full rounded-md border border-white/[0.1] bg-white/[0.05] pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-white/30 sm:w-40"
            />
          </div>

          {/* Botón filtros móvil */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors sm:hidden",
              filtersOpen || activeFilters
                ? "border-white/30 bg-white/[0.1] text-white"
                : "border-white/[0.1] text-[var(--color-text-muted)] hover:bg-white/[0.06]",
            )}
          >
            <Filter size={13} />
            {activeFilters && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </button>

          {/* Filtros desktop */}
          <div className="ml-auto hidden sm:block">
            <BoardFilters
              filters={filters}
              setFilters={setFilters}
              members={members}
              clients={clients}
            />
          </div>
        </div>

        {/* Filtros móvil colapsable */}
        {filtersOpen && (
          <div className="border-b border-white/[0.08] px-3 py-2 sm:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Filtros</span>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
              >
                <X size={14} />
              </button>
            </div>
            <BoardFilters
              filters={filters}
              setFilters={setFilters}
              members={members}
              clients={clients}
            />
          </div>
        )}

        {/* Vista */}
        <div className="min-h-0 flex-1">
          {view === "board" ? (
            <Board
              columns={columns}
              memberMap={memberMap}
              clientMap={clientMap}
              progressFor={progressFor}
              onOpenTask={(t) => setSelectedId(t.id)}
              onQuickAdd={(status, title) => void handleCreate({ status, title })}
              onMove={handleMove}
              onStatusChange={handleSwipeStatus}
              newTaskSignal={newTaskSignal}
            />
          ) : (
            <ListView
              tasks={listTasks}
              memberMap={memberMap}
              clientMap={clientMap}
              onOpenTask={(t) => setSelectedId(t.id)}
              onUpdate={handleUpdate}
            />
          )}
        </div>

        {/* Toast auto-completar (SUB-07) */}
        {toast && (
          <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-4 py-2 text-sm shadow-lg">
            <span>{t("allSubtasksDone", { title: toast.label })}</span>
            <button
              className="font-medium text-[var(--color-accent-hover)] hover:underline"
              onClick={() => {
                void handleUpdate({ id: toast.parentId, status: "completada" });
                setToast(null);
              }}
            >
              {t("markComplete")}
            </button>
            <button
              className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
              onClick={() => setToast(null)}
            >
              {t("dismiss")}
            </button>
          </div>
        )}
      </div>

      {selected && (
        <TaskDetail
          task={selected}
          tasks={tasks}
          members={members}
          clients={clients}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onToggleSubtask={handleToggleSubtask}
          onAddSubtask={(parentId, title) => void handleCreate({ parentId, title })}
          onOpenTask={(t) => setSelectedId(t.id)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function ToolbarToggle({
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
        "flex items-center gap-1 px-2.5 py-1 text-xs first:rounded-l-md last:rounded-r-md",
        active
          ? "bg-white/[0.12] text-white"
          : "text-[var(--color-text-muted)] hover:bg-white/[0.06] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}
