import { getAppContext } from "@/server/services/context";
import { listArchivedTasks } from "@/server/services/archive";
import { listActiveClients, listWorkspaceMembers } from "@/server/services/members";
import { ArchiveView, type ArchiveRow } from "@/components/archive/ArchiveView";

/*
 * /archive: vista global de tareas archivadas (ARC-03/04). Carga todas las
 * archivadas del workspace + áreas/clientes/miembros para los filtros.
 */
export default async function ArchivePage() {
  const ctx = await getAppContext();
  const [rowsRaw, clients, members] = await Promise.all([
    listArchivedTasks(ctx.workspaceId),
    listActiveClients(ctx.workspaceId),
    listWorkspaceMembers(ctx.workspaceId),
  ]);

  const rows: ArchiveRow[] = rowsRaw.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    areaId: r.areaId,
    areaName: r.areaName,
    clientName: r.clientName,
    assigneeName: r.assigneeName,
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
  }));

  return (
    <ArchiveView
      rows={rows}
      areas={ctx.areas.map((a) => ({ id: a.id, name: a.name }))}
      members={members}
      clients={clients}
    />
  );
}
