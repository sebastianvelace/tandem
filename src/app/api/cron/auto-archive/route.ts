import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { autoArchiveCompleted } from "@/server/services/archive";

/*
 * Cron de auto-archivado (ARC-01, ARQ-08). Vercel Cron lo invoca a diario con
 * `Authorization: Bearer <CRON_SECRET>`. No usa sesión de usuario: se autentica
 * solo con el secreto. Archiva tareas completadas hace >7 días.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const archived = await autoArchiveCompleted(7);
  return NextResponse.json({ ok: true, archived });
}
