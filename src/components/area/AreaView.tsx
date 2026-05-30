"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Hash, MessageSquare, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientLite, MemberLite, RootMessageDTO } from "@/lib/chat/types";
import type { TaskDTO } from "@/lib/board/types";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { BoardClient } from "@/components/board/BoardClient";

/*
 * Vista de área: Chat (izquierda) + Tablero (derecha).
 * En desktop: paneles lado a lado. En móvil: tabs para alternar.
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
  const [mobileTab, setMobileTab] = useState<"chat" | "board">("board");

  return (
    <div className="flex h-full min-w-0 flex-col md:flex-row">
      {/* Barra de tabs — solo móvil */}
      <div className="flex shrink-0 border-b border-white/[0.08] md:hidden">
        <button
          onClick={() => setMobileTab("chat")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
            mobileTab === "chat"
              ? "border-b-2 border-white text-[var(--color-text)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          )}
        >
          <MessageSquare size={14} />
          Chat
        </button>
        <button
          onClick={() => setMobileTab("board")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
            mobileTab === "board"
              ? "border-b-2 border-white text-[var(--color-text)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          )}
        >
          <LayoutGrid size={14} />
          Tablero
        </button>
      </div>

      {/* Panel de chat */}
      <div
        className={cn(
          "shrink-0 flex-col border-white/[0.08]",
          "w-full md:w-80 md:border-r",
          mobileTab === "chat" ? "flex" : "hidden md:flex",
        )}
      >
        <div className="hidden h-11 shrink-0 items-center gap-2 border-b border-white/[0.08] px-4 md:flex">
          <Hash size={14} className="text-[var(--color-text-faint)]" />
          <span className="truncate text-sm font-semibold">{areaName}</span>
          <span className="ml-auto text-xs text-[var(--color-text-faint)]">{t("chat")}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
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

      {/* Panel de tablero */}
      <div
        className={cn(
          "min-w-0 flex-1 flex-col",
          mobileTab === "board" ? "flex" : "hidden md:flex",
        )}
      >
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
