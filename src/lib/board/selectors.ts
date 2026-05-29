import type { TaskDTO, TaskPriority, TaskStatus } from "./types";

/*
 * Derivaciones puras del set plano de tareas: árbol de subtareas, columnas del
 * tablero, progreso recursivo (SUB-06/07) y filtros (BRD-03/04/05). Sin estado
 * ni efectos: el cliente las recomputa en cada render.
 */

const PRIORITY_RANK: Record<TaskPriority, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

export type SortMode = "manual" | "priority";

export type BoardFilters = {
  priorities: TaskPriority[];
  assignees: string[]; // userIds; vacío = todos
  unassigned: boolean; // incluir tareas sin responsable
  clientId: string | null; // null = sin filtro; "__none__" = sin cliente
};

export const EMPTY_FILTERS: BoardFilters = {
  priorities: [],
  assignees: [],
  unassigned: false,
  clientId: null,
};

/** Mapa parentId → hijos directos (clave "" para las raíces). */
export function childrenByParent(tasks: TaskDTO[]): Map<string, TaskDTO[]> {
  const map = new Map<string, TaskDTO[]>();
  for (const t of tasks) {
    const key = t.parentId ?? "";
    const arr = map.get(key);
    if (arr) arr.push(t);
    else map.set(key, [t]);
  }
  return map;
}

export function rootTasks(tasks: TaskDTO[]): TaskDTO[] {
  return tasks.filter((t) => t.parentId === null);
}

export function getChildren(
  parentId: string,
  byParent: Map<string, TaskDTO[]>,
): TaskDTO[] {
  return [...(byParent.get(parentId) ?? [])].sort(byPosition);
}

export function byPosition(a: TaskDTO, b: TaskDTO): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.createdAt < b.createdAt ? -1 : 1;
}

export function sortTasks(list: TaskDTO[], mode: SortMode): TaskDTO[] {
  const copy = [...list];
  if (mode === "priority") {
    return copy.sort((a, b) => {
      const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return r !== 0 ? r : byPosition(a, b);
    });
  }
  return copy.sort(byPosition);
}

/** Progreso recursivo de subtareas (SUB-06): cuenta TODOS los descendientes. */
export function subtaskProgress(
  taskId: string,
  byParent: Map<string, TaskDTO[]>,
): { total: number; completed: number } {
  let total = 0;
  let completed = 0;
  const stack = [...(byParent.get(taskId) ?? [])];
  let guard = 0;
  while (stack.length && guard++ < 10000) {
    const t = stack.pop()!;
    total++;
    if (t.status === "completada") completed++;
    const kids = byParent.get(t.id);
    if (kids) stack.push(...kids);
  }
  return { total, completed };
}

export function passesFilters(t: TaskDTO, f: BoardFilters): boolean {
  if (f.priorities.length > 0 && !f.priorities.includes(t.priority)) return false;

  if (f.assignees.length > 0 || f.unassigned) {
    const matchAssignee =
      t.assigneeUserId !== null && f.assignees.includes(t.assigneeUserId);
    const matchUnassigned = f.unassigned && t.assigneeUserId === null;
    if (!matchAssignee && !matchUnassigned) return false;
  }

  if (f.clientId === "__none__") {
    if (t.clientId !== null) return false;
  } else if (f.clientId) {
    if (t.clientId !== f.clientId) return false;
  }
  return true;
}

export function hasActiveFilters(f: BoardFilters): boolean {
  return (
    f.priorities.length > 0 ||
    f.assignees.length > 0 ||
    f.unassigned ||
    f.clientId !== null
  );
}

/** Columnas del tablero: raíces por status, filtradas y ordenadas. */
export function buildColumns(
  tasks: TaskDTO[],
  filters: BoardFilters,
  sort: SortMode,
  query: string,
): Record<TaskStatus, TaskDTO[]> {
  const q = query.trim().toLowerCase();
  const roots = rootTasks(tasks).filter(
    (t) =>
      passesFilters(t, filters) &&
      (q === "" || t.title.toLowerCase().includes(q)),
  );
  return {
    por_hacer: sortTasks(roots.filter((t) => t.status === "por_hacer"), sort),
    en_proceso: sortTasks(roots.filter((t) => t.status === "en_proceso"), sort),
    completada: sortTasks(roots.filter((t) => t.status === "completada"), sort),
  };
}
