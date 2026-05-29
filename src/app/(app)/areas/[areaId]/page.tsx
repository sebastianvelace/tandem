import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAppContext } from "@/server/services/context";

/*
 * Detalle de área = tablero + chat (§6.6). En Sprint 1 son placeholders;
 * el tablero Kanban llega en Sprint 3 y el chat en Sprint 2.
 * Aquí ya se valida que el área pertenece al workspace del usuario (anti-IDOR).
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

  const t = await getTranslations();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-[var(--color-border)] px-5">
        <span className="text-sm font-medium">{area.name}</span>
      </div>
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-faint)]">
        {/* Sprint 2: chat · Sprint 3: tablero Kanban */}
        {t("emptyStates.selectArea")}
      </div>
    </div>
  );
}
