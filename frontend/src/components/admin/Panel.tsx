import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("admin-card", className)}>{children}</section>;
}

export function StatusDot({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={cn("admin-status", active ? "is-on" : "is-off")}>
      {children}
    </span>
  );
}
