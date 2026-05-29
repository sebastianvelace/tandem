import { resolveActiveWorkspace } from "@/server/auth/authz";
import { listClients } from "@/server/services/clients";
import { ClientDirectory } from "@/components/client/ClientDirectory";

/*
 * /clients: directorio del workspace (CLI-01..05/10). Vive en la sidebar
 * (no es navegación principal). Carga incluye inactivos (se filtran en UI).
 */
export default async function ClientsPage() {
  const { workspaceId } = await resolveActiveWorkspace();
  const clients = await listClients(workspaceId, { includeInactive: true });
  return <ClientDirectory initial={clients} />;
}
