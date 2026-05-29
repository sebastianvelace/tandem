import { getAppContext } from "@/server/services/context";
import { listScheduledTasks } from "@/server/services/tasks";
import {
  CalendarView,
  type CalendarTask,
} from "@/components/calendar/CalendarView";

export default async function CalendarPage() {
  const ctx = await getAppContext();
  const rows = await listScheduledTasks(ctx.workspaceId);
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
  return <CalendarView tasks={tasks} areas={ctx.areas} />;
}
