import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: string | number, currency = "COP") {
  const amount = typeof value === "string" ? Number(value) : value;
  const formatted = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
  return `$${formatted} ${currency}`;
}
