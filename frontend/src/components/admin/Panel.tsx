import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("border border-black bg-white", className)}>{children}</section>;
}

export function StatusDot({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]",
        active ? "bg-charcoal text-white" : "border border-black/20 text-neutral-600",
      )}
    >
      {children}
    </span>
  );
}
