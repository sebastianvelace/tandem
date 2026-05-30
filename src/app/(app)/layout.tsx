import { getAppContext } from "@/server/services/context";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();

  return (
    <AppShell areas={ctx.areas} workspaceName={ctx.workspaceName} user={ctx.user}>
      {children}
    </AppShell>
  );
}
