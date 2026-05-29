import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAppContext } from "@/server/services/context";

/*
 * /areas: redirige a la primera área (normalmente General). Si no hubiera
 * áreas, muestra empty state (UX-11).
 */
export default async function AreasIndexPage() {
  const ctx = await getAppContext();
  const first = ctx.areas[0];
  if (first) redirect(`/areas/${first.id}`);

  const t = await getTranslations("emptyStates");
  return (
    <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
      {t("noAreas")}
    </div>
  );
}
