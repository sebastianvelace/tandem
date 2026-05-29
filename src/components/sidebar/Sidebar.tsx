"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, Archive, Users, Hash, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/db/schema";
import { CreateAreaButton } from "./CreateAreaButton";

export function Sidebar({
  areas,
  workspaceName,
}: {
  areas: Area[];
  workspaceName: string;
}) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();

  return (
    <aside className="glass flex h-screen w-56 shrink-0 flex-col border-r border-white/[0.06] bg-black/50">
      <div className="flex h-14 items-center border-b border-white/[0.05] px-4">
        <span className="truncate text-sm font-semibold tracking-tight text-[var(--color-text)]">
          {workspaceName}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
        <SectionLabel>{t("areas")}</SectionLabel>
        <ul className="mb-3 space-y-0.5">
          {areas.map((area) => {
            const href = `/areas/${area.id}`;
            const active = pathname === href;
            return (
              <li key={area.id}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                    active
                      ? "bg-white/[0.1] text-white"
                      : "text-[var(--color-text-muted)] hover:bg-white/[0.06] hover:text-[var(--color-text)]",
                  )}
                >
                  <Hash
                    size={14}
                    style={area.color ? { color: area.color } : undefined}
                  />
                  <span className="truncate">{area.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <CreateAreaButton />

        <div className="my-3 border-t border-white/[0.05]" />

        <ul className="space-y-0.5">
          <SecondaryLink href="/clients" active={pathname.startsWith("/clients")} icon={<Users size={14} />}>
            {t("clients")}
          </SecondaryLink>
          <SecondaryLink href="/calendar" active={pathname.startsWith("/calendar")} icon={<Calendar size={14} />}>
            {t("calendar")}
          </SecondaryLink>
          <SecondaryLink href="/archive" active={pathname.startsWith("/archive")} icon={<Archive size={14} />}>
            {t("archive")}
          </SecondaryLink>
          <SecondaryLink href="/settings/workspace" active={pathname.startsWith("/settings")} icon={<Settings size={14} />}>
            {t("settings")}
          </SecondaryLink>
        </ul>
      </nav>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">
      {children}
    </p>
  );
}

function SecondaryLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
          active
            ? "bg-white/[0.1] text-white"
            : "text-[var(--color-text-muted)] hover:bg-white/[0.06] hover:text-[var(--color-text)]",
        )}
      >
        {icon}
        <span>{children}</span>
      </Link>
    </li>
  );
}

export { Plus };
