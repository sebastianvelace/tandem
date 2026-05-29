"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportWorkspaceAction } from "@/server/actions/export";

/*
 * Botón de export del workspace a JSON (SEC-04, S5-T05). Solo admin lo ve.
 */
export function ExportWorkspace() {
  const t = useTranslations("settings");
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    const res = await exportWorkspaceAction();
    setPending(false);
    if (!res.ok) return;
    const blob = new Blob([res.data.json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tandem-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void download()} disabled={pending}>
      <Download size={14} />
      {t("exportWorkspace")}
    </Button>
  );
}
