import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export function Badge({
  children,
  tone = "forest",
}: {
  children: ReactNode;
  tone?: "forest" | "gold" | "fog" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]",
        tone === "forest" && "bg-forest text-cream",
        tone === "gold" && "bg-gold/15 text-gold",
        tone === "fog" && "bg-fog text-forest",
        tone === "muted" && "bg-sand text-forest-soft",
      )}
    >
      {children}
    </span>
  );
}
