import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary: "admin-cta",
  secondary:
    "admin-cta-hover inline-flex items-center justify-center rounded-full border border-forest/15 bg-white px-[22px] py-2 font-poppins text-[13.5px] font-medium tracking-[0.03em] text-ink",
  ghost:
    "inline-flex items-center justify-center rounded-full bg-transparent px-[18px] py-2 font-poppins text-[13.5px] font-medium tracking-[0.03em] text-forest hover:bg-forest/5",
};

const sizes = {
  sm: "min-h-8 px-4 text-[13px]",
  md: "",
  lg: "admin-cta--lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(variants[variant], variant === "primary" && size === "sm" && "admin-cta--sm", sizes[size], className)}
      {...props}
    />
  );
}
