/*
 * DTOs del tablero compartidos cliente/servidor. Fechas como ISO string para
 * coincidir con la respuesta de Server Actions y el payload Realtime.
 * El cliente recibe el set PLANO de tareas del área (raíces + subtareas) y
 * deriva columnas, subárboles (SUB) y progreso recursivo en memoria.
 */
export type TaskStatus = "por_hacer" | "en_proceso" | "completada";
export type TaskPriority = "alta" | "media" | "baja";

export const TASK_STATUSES: TaskStatus[] = [
  "por_hacer",
  "en_proceso",
  "completada",
];

export type TaskDTO = {
  id: string;
  areaId: string;
  clientId: string | null;
  parentId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeUserId: string | null;
  dueDate: string | null;
  position: number;
  sourceMessageId: string | null;
  completedAt: string | null;
  createdAt: string;
};
