import { notFound } from "next/navigation";
import { getAppContext } from "@/server/services/context";
import { listAreaMessages } from "@/server/services/messages";
import { listActiveClients, listWorkspaceMembers } from "@/server/services/members";
import { ChatPanel } from "@/components/chat/ChatPanel";

/*
 * Detalle de área = chat (Sprint 2) + tablero (Sprint 3, pendiente).
 * Server Component: resuelve contexto y carga datos iniciales del chat
 * verificando que el área pertenece al workspace del usuario (anti-IDOR).
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

  const [initialMessages, members, clients] = await Promise.all([
    listAreaMessages(ctx.workspaceId, areaId),
    listWorkspaceMembers(ctx.workspaceId),
    listActiveClients(ctx.workspaceId),
  ]);

  return (
    <ChatPanel
      areaId={areaId}
      areaName={area.name}
      currentUserId={ctx.user.id}
      members={members}
      clients={clients}
      initialMessages={initialMessages}
    />
  );
}
