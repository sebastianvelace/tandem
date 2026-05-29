import { resolveActiveWorkspace } from "@/server/auth/authz";
import { listScheduledTasks } from "@/server/services/tasks";
import {
  CalendarView,
  type CalendarTask,
} from "@/components/calendar/CalendarView";

/*
 * /calendar: vista calendario interna del workspace (CAL-01..04). Tareas con
 * fecha límite de todas las áreas. Solo lectura; el sync con Google es aparte.
 */
export default async function CalendarPage() {
  const { workspaceId } = await resolveActiveWorkspace();
  const rows = await listScheduledTasks(workspaceId);
  const tasks: CalendarTask[] = rows
    .filter((r) => r.dueDate !== null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      priority: r.priority,
      areaId: r.areaId,
      dueDate: r.dueDate!.toISOString(),
    }));
  return <CalendarView tasks={tasks} />;
}
