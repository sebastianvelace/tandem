import { notFound } from "next/navigation";
import { resolveActiveWorkspace } from "@/server/auth/authz";
import { getClient, listClientTasks } from "@/server/services/clients";
import { AppError } from "@/server/auth/errors";
import {
  ClientDetail,
  type ClientTaskRow,
} from "@/components/client/ClientDetail";

/*
 * /clients/[id]: ficha de cliente (CLI-06/08/09). Verifica scope (anti-IDOR)
 * cargando el cliente dentro del workspace de la sesión.
 */
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspaceId } = await resolveActiveWorkspace();

  try {
    const client = await getClient(workspaceId, id);
    const rows = await listClientTasks(workspaceId, id);
    const tasks: ClientTaskRow[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      priority: r.priority,
      areaId: r.areaId,
      areaName: r.areaName,
      archived: r.archivedAt !== null,
    }));
    return <ClientDetail client={client} tasks={tasks} />;
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
