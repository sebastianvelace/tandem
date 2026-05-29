"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { createAreaAction } from "@/server/actions/areas";

/*
 * AREA-02: cualquier miembro crea un área. Inline mínimo para el MVP del shell;
 * el modal completo (color/icono) llega en pulido. Muestra error de duplicado.
 */
export function CreateAreaButton() {
  const t = useTranslations("areas");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const res = await createAreaAction({ name: trimmed });
      if (res.ok) {
        setName("");
        setOpen(false);
        router.refresh();
      } else {
        setError(
          res.error.code === "CONFLICT" ? t("errorDuplicate") : res.error.message,
        );
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text-faint)] transition-colors duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
      >
        <Plus size={15} />
        <span>{t("create")}</span>
      </button>
    );
  }

  return (
    <div className="px-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
            setError(null);
          }
        }}
        placeholder={t("namePlaceholder")}
        disabled={pending}
        aria-label={t("name")}
        className="w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      {error && <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
