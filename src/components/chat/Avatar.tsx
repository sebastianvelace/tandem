import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MemberLite } from "@/lib/chat/types";

/** Avatar circular con imagen de Google o inicial de respaldo. */
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

  if (member?.avatarUrl) {
    return (
      <Image
        src={member.avatarUrl}
        alt={label}
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
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
