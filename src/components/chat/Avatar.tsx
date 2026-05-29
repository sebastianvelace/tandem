import { cn } from "@/lib/utils";
import type { MemberLite } from "@/lib/chat/types";

/** Inicial del miembro (sin foto de perfil). */
export function Avatar({
  member,
  size = 32,
  className,
}: {
  member: Pick<MemberLite, "name" | "email" | "avatarUrl"> | undefined;
  size?: number;
  className?: string;
}) {
  const label = member?.name ?? member?.email ?? "?";
  const initial = label.charAt(0).toUpperCase();

  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-xs font-medium text-[var(--color-text)]",
        className,
      )}
    >
      {initial}
    </span>
  );
}
