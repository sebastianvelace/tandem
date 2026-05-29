"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessagesSquare, SquareKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientLite, MemberLite, RootMessageDTO } from "@/lib/chat/types";
import type { TaskDTO } from "@/lib/board/types";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BoardClient } from "@/components/board/BoardClient";

/*
 * Vista de área (§6.6): pestañas Chat / Tablero. Ambos paneles se montan a la
 * vez (se oculta el inactivo) para conservar sus suscripciones Realtime y el
 * estado al alternar.
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
  const [tab, setTab] = useState<"chat" | "board">("chat");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-[var(--color-border)] px-4">
        <span className="mr-3 text-sm font-medium">{areaName}</span>
        <Tab active={tab === "chat"} onClick={() => setTab("chat")}>
          <MessagesSquare size={14} /> {t("chat")}
        </Tab>
        <Tab active={tab === "board"} onClick={() => setTab("board")}>
          <SquareKanban size={14} /> {t("board")}
        </Tab>
      </div>

      <div className={cn("min-h-0 flex-1", tab === "chat" ? "flex" : "hidden")}>
        <ChatPanel
          areaId={areaId}
          areaName={areaName}
          currentUserId={currentUserId}
          members={members}
          clients={clients}
          initialMessages={initialMessages}
        />
      </div>
      <div className={cn("min-h-0 flex-1", tab === "board" ? "flex" : "hidden")}>
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

function Tab({
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
        "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors",
        active
          ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}
