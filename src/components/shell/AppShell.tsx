"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Area, User } from "@/db/schema";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/header/Header";

export function AppShell({
  areas,
  workspaceName,
  user,
  children,
}: {
  areas: Area[];
  workspaceName: string;
  user: User;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: drawer en móvil, columna fija en desktop */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out",
          "md:relative md:inset-auto md:z-auto md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          areas={areas}
          workspaceName={workspaceName}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <main className="animate-fade-in min-h-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
