"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, Archive, Users, Hash, Settings, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Area } from "@/db/schema";
import { CreateAreaButton } from "./CreateAreaButton";

export function Sidebar({
  areas,
  workspaceName,
  onClose,
}: {
  areas: Area[];
  workspaceName: string;
  onClose?: () => void;
}) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const [areasOpen, setAreasOpen] = useState(true);

  return (
    <aside className="glass flex h-screen w-56 shrink-0 flex-col border-r border-white/[0.1] bg-black/60">
      {/* Cabecera del workspace */}
      <div className="flex h-14 items-center gap-2 border-b border-white/[0.08] px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-[var(--color-text)]">
          {workspaceName}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-faint)] hover:bg-white/[0.07] hover:text-[var(--color-text)] md:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
        {/* Sección Áreas — colapsable */}
        <button
          onClick={() => setAreasOpen((v) => !v)}
          className="flex w-full items-center gap-1 px-2 pb-1.5 pt-1"
        >
          <p className="flex-1 text-left text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
            {t("areas")}
          </p>
          <ChevronDown
            size={12}
            className={cn(
              "text-[var(--color-text-faint)] transition-transform duration-200",
              areasOpen ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>

        {areasOpen && (
          <>
            <ul className="mb-2 space-y-0.5">
              {areas.map((area) => {
                const href = `/areas/${area.id}`;
                const active = pathname === href;
                return (
                  <li key={area.id}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                        active
                          ? "bg-white/[0.1] text-white"
                          : "text-[var(--color-text-muted)] hover:bg-white/[0.07] hover:text-[var(--color-text)]",
                      )}
                    >
                      <Hash
                        size={14}
                        className="shrink-0"
                        style={area.color ? { color: area.color } : undefined}
                      />
                      <span className="truncate">{area.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <CreateAreaButton />
          </>
        )}

        <div className="my-3 border-t border-white/[0.07]" />

        <ul className="space-y-0.5">
          <SecondaryLink
            href="/clients"
            active={pathname.startsWith("/clients")}
            icon={<Users size={14} />}
            onClick={onClose}
          >
            {t("clients")}
          </SecondaryLink>
          <SecondaryLink
            href="/calendar"
            active={pathname.startsWith("/calendar")}
            icon={<Calendar size={14} />}
            onClick={onClose}
          >
            {t("calendar")}
          </SecondaryLink>
          <SecondaryLink
            href="/archive"
            active={pathname.startsWith("/archive")}
            icon={<Archive size={14} />}
            onClick={onClose}
          >
            {t("archive")}
          </SecondaryLink>
          <SecondaryLink
            href="/settings/workspace"
            active={pathname.startsWith("/settings")}
            icon={<Settings size={14} />}
            onClick={onClose}
          >
            {t("settings")}
          </SecondaryLink>
        </ul>
      </nav>
    </aside>
  );
}

function SecondaryLink({
  href,
  active,
  icon,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
          active
            ? "bg-white/[0.1] text-white"
            : "text-[var(--color-text-muted)] hover:bg-white/[0.07] hover:text-[var(--color-text)]",
        )}
      >
        {icon}
        <span>{children}</span>
      </Link>
    </li>
  );
}
