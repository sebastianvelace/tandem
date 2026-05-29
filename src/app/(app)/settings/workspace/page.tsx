import { getTranslations } from "next-intl/server";
import { getAppContext } from "@/server/services/context";
import { listMembersAction } from "@/server/actions/invitations";
import { getCalendarStatusAction } from "@/server/actions/calendar";
import { InviteMember } from "@/components/settings/InviteMember";
import { CalendarConnection } from "@/components/settings/CalendarConnection";

/* Configuración → Workspace: miembros + invitar (solo admin gestiona). */
export default async function WorkspaceSettingsPage() {
  const ctx = await getAppContext();
  const t = await getTranslations("settings");
  const membersRes = await listMembersAction();
  const members = membersRes.ok ? membersRes.data : [];
  const calStatus = await getCalendarStatusAction();
  const calConnected = calStatus.ok ? calStatus.data.connected : false;

  // Miembros no-admin solo ven la lista; el formulario de invitación se
  // muestra condicionalmente más abajo (solo admin).

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold">{t("workspace")}</h1>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-[var(--color-text-muted)]">
          {t("members")}
        </h2>
        <ul className="mt-3 divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm">{m.name ?? m.email}</p>
                <p className="text-xs text-[var(--color-text-faint)]">{m.email}</p>
              </div>
              <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
          {t("googleCalendar")}
        </h2>
        <CalendarConnection initialConnected={calConnected} />
      </section>

      {ctx.role === "admin" && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
            {t("inviteMember")}
          </h2>
          <InviteMember />
        </section>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
