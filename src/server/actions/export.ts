"use server";

import { assertAdmin, resolveActiveWorkspace } from "@/server/auth/authz";
import { toActionResult } from "@/server/auth/errors";
import { exportWorkspace } from "@/server/services/export";

/*
 * Export del workspace (SEC-04). Solo admin. Devuelve el JSON serializado para
 * que el cliente lo descargue.
 */
export async function exportWorkspaceAction() {
  return toActionResult(async () => {
    const { workspaceId, role } = await resolveActiveWorkspace();
    assertAdmin(role);
    const data = await exportWorkspace(workspaceId);
    return { json: JSON.stringify(data, null, 2) };
  });
}
