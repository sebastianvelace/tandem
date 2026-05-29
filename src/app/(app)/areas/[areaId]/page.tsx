import { notFound } from "next/navigation";
import { getAppContext } from "@/server/services/context";
import { listAreaMessages } from "@/server/services/messages";
import { listAreaTasks } from "@/server/services/tasks";
import { listActiveClients, listWorkspaceMembers } from "@/server/services/members";
import { AreaView } from "@/components/area/AreaView";

/*
 * Detalle de área = Chat (Sprint 2) + Tablero (Sprint 3) en pestañas.
 * Server Component: resuelve contexto y carga los datos iniciales de ambos
 * paneles verificando que el área pertenece al workspace (anti-IDOR).
 */
export default async function AreaPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = await params;
  const ctx = await getAppContext();
  const area = ctx.areas.find((a) => a.id === areaId);
  if (!area) notFound();

  const [initialMessages, initialTasks, members, clients] = await Promise.all([
    listAreaMessages(ctx.workspaceId, areaId),
    listAreaTasks(ctx.workspaceId, areaId),
    listWorkspaceMembers(ctx.workspaceId),
    listActiveClients(ctx.workspaceId),
  ]);

  return (
    <AreaView
      areaId={areaId}
      areaName={area.name}
      currentUserId={ctx.user.id}
      members={members}
      clients={clients}
      initialMessages={initialMessages}
      initialTasks={initialTasks}
    />
  );
}
