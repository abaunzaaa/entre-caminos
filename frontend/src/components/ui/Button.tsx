import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "gold";
  size?: "md" | "lg" | "sm";
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-4 py-2 text-sm",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-base",
        variant === "primary" && "bg-charcoal text-white hover:bg-forest-deep",
        variant === "secondary" && "border border-black bg-white text-ink hover:bg-sand",
        variant === "ghost" && "text-forest hover:bg-forest/5",
        variant === "gold" && "bg-gold text-white hover:bg-[#9a753f]",
        className,
      )}
      {...props}
    />
  );
}
