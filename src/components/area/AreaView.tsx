"use client";

import { useTranslations } from "next-intl";
import { Hash } from "lucide-react";
import type { ClientLite, MemberLite, RootMessageDTO } from "@/lib/chat/types";
import type { TaskDTO } from "@/lib/board/types";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BoardClient } from "@/components/board/BoardClient";

/*
 * Vista de área: Chat (izquierda, siempre visible) + Tablero (derecha, flex-1).
 * Ambos paneles se montan a la vez para conservar sus suscripciones Realtime.
 */
export function AreaView({
  areaId,
  areaName,
  currentUserId,
  members,
  clients,
  initialMessages,
  initialTasks,
}: {
  areaId: string;
  areaName: string;
  currentUserId: string;
  members: MemberLite[];
  clients: ClientLite[];
  initialMessages: RootMessageDTO[];
  initialTasks: TaskDTO[];
}) {
  const t = useTranslations("area");

  return (
    <div className="flex h-full min-w-0">
      {/* Panel de chat — columna izquierda fija */}
      <div className="flex w-80 shrink-0 flex-col border-r border-white/[0.06]">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
          <Hash size={14} className="text-[var(--color-text-faint)]" />
          <span className="truncate text-sm font-semibold">{areaName}</span>
          <span className="ml-auto text-xs text-[var(--color-text-faint)]">{t("chat")}</span>
        </div>
        <div className="min-h-0 flex-1 flex flex-col">
          <ChatPanel
            areaId={areaId}
            areaName={areaName}
            currentUserId={currentUserId}
            members={members}
            clients={clients}
            initialMessages={initialMessages}
          />
        </div>
      </div>

      {/* Panel de tablero — columna derecha */}
      <div className="flex min-w-0 flex-1 flex-col">
        <BoardClient
          areaId={areaId}
          members={members}
          clients={clients}
          initialTasks={initialTasks}
        />
      </div>
    </div>
  );
}
