import { getAppContext } from "@/server/services/context";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/header/Header";

/*
 * Shell de la app autenticada (§6.6): sidebar + header + panel principal.
 * El gate de middleware ya garantiza sesión; aquí se resuelve el contexto.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar areas={ctx.areas} workspaceName={ctx.workspaceName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={ctx.user} />
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
