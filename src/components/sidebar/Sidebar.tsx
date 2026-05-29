"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, Archive, Users, Hash, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Area } from "@/db/schema";
import { CreateAreaButton } from "./CreateAreaButton";

/*
 * Sidebar izquierda (§6.6): Áreas (navegación principal) + secciones
 * secundarias (Clientes, Calendario, Archivo). Clientes NO es navegación
 * principal (CLI-08): vive aquí, debajo de las áreas.
 */
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
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-14 items-center px-4">
        <span className="truncate text-sm font-semibold">{workspaceName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SectionLabel>{t("areas")}</SectionLabel>
        <ul className="mb-4 space-y-0.5">
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
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
                  )}
                >
                  <Hash
                    size={15}
                    style={area.color ? { color: area.color } : undefined}
                  />
                  <span className="truncate">{area.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <CreateAreaButton />

        <div className="my-4 border-t border-[var(--color-border)]" />

        <ul className="space-y-0.5">
          <SecondaryLink href="/clients" active={pathname.startsWith("/clients")} icon={<Users size={15} />}>
            {t("clients")}
          </SecondaryLink>
          <SecondaryLink href="/calendar" active={pathname.startsWith("/calendar")} icon={<Calendar size={15} />}>
            {t("calendar")}
          </SecondaryLink>
          <SecondaryLink href="/archive" active={pathname.startsWith("/archive")} icon={<Archive size={15} />}>
            {t("archive")}
          </SecondaryLink>
        </ul>
      </nav>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
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
            ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
        )}
      >
        {icon}
        <span>{children}</span>
      </Link>
    </li>
  );
}

export { Plus };
