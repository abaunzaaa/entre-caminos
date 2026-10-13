import { ONBOARDING_BUDGETS } from "../config/onboarding.js";
import { rateToCop } from "../config/exchange-rates.js";

export type BudgetLevel = (typeof ONBOARDING_BUDGETS)[number];

/** Topes inclusivos, en COP, de cada nivel excepto Lujo. */
export const BUDGET_LIMITS_COP = {
  economico: 150_000,
  moderado: 300_000,
  alto: 500_000,
} as const;

export function isBudgetLevel(value: string): value is BudgetLevel {
  return (ONBOARDING_BUDGETS as readonly string[]).includes(value);
}

function amount(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Equivalente interno en COP. No modifica el precio guardado.
 * COP no se convierte. Una moneda sin tasa devuelve null.
 */
export function normalizePriceToCOP(price: number, currency?: string | null) {
  const value = amount(price);
  if (value == null) {
    return null;
  }
  const code = (currency || "COP").trim().toUpperCase();
  if (code === "COP") {
    return value;
  }
  const rate = rateToCop(code);
  if (rate == null) {
    return null;
  }
  return value * rate;
}

export function getBudgetLevel(price: number, currency?: string | null): BudgetLevel | null {
  const cop = normalizePriceToCOP(price, currency);
  if (cop == null) {
    return null;
  }
  if (cop <= BUDGET_LIMITS_COP.economico) {
    return "Económico";
  }
  if (cop <= BUDGET_LIMITS_COP.moderado) {
    return "Moderado";
  }
  if (cop <= BUDGET_LIMITS_COP.alto) {
    return "Alto";
  }
  return "Lujo";
}
