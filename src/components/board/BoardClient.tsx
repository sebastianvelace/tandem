"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, List, Search } from "lucide-react";
import { cn } from "@/lib/utils";
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

/*
 * Orquestador del tablero (Sprint 3). Mantiene el set de tareas en tiempo real
 * (useAreaTasks), aplica filtros/orden/búsqueda y vista (tablero/lista), y
 * coordina las mutaciones con actualización optimista. La autorización vive en
 * las Server Actions.
 */
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
  const [toast, setToast] = useState<{ parentId: string; label: string } | null>(
    null,
  );

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

  // ----- mutaciones -----
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
      // Optimista: fusionamos el patch mientras viaja la action.
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
      upsert(prev); // revertir
    }
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

  /** SUB-07: si todas las subtareas de un padre están completas, sugerirlo. */
  function maybeSuggestParent(changed: TaskDTO) {
    if (!changed.parentId) return;
    const parent = tasks.find((x) => x.id === changed.parentId);
    if (!parent || parent.status === "completada") return;
    const prog = subtaskProgress(parent.id, childrenByParent(tasks));
    // tasks aún no refleja el cambio recién guardado; lo contamos aparte.
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
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-4 py-2">
          <div className="flex items-center rounded-md border border-[var(--color-border-strong)]">
            <ToolbarToggle active={view === "board"} onClick={() => setView("board")}>
              <LayoutGrid size={14} /> {t("board")}
            </ToolbarToggle>
            <ToolbarToggle active={view === "list"} onClick={() => setView("list")}>
              <List size={14} /> {t("list")}
            </ToolbarToggle>
          </div>

          <button
            onClick={() => setSort(sort === "manual" ? "priority" : "manual")}
            className="rounded-md border border-[var(--color-border-strong)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {sort === "manual" ? t("orderManual") : t("orderPriority")}
          </button>

          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-7 w-44 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="ml-auto">
            <BoardFilters
              filters={filters}
              setFilters={setFilters}
              members={members}
              clients={clients}
            />
          </div>
        </div>

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
          ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}
