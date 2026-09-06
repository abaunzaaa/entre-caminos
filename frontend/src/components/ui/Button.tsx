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
        variant === "primary" && "admin-cta",
        variant === "primary" && size === "sm" && "admin-cta--sm",
        variant === "primary" && size === "lg" && "admin-cta--lg",
        variant !== "primary" &&
          "inline-flex items-center justify-center rounded-full font-poppins font-medium tracking-[0.03em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant !== "primary" && size === "sm" && "px-5 py-1.5 text-[13px]",
        variant !== "primary" && size === "md" && "px-[22px] py-2 text-[13.5px]",
        variant !== "primary" && size === "lg" && "px-7 py-2.5 text-sm",
        variant === "secondary" && "border border-forest/15 bg-white text-ink hover:bg-[#eef3ef]",
        variant === "ghost" && "text-forest hover:bg-forest/5",
        variant === "gold" && "bg-gold text-white hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}
