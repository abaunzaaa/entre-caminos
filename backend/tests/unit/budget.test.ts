import { describe, expect, it } from "vitest";
import { ONBOARDING_BUDGETS } from "../../src/config/onboarding.js";
import { FALLBACK_USD_TO_COP } from "../../src/config/exchange-rates.js";
import { BUDGET_LIMITS_COP, getBudgetLevel, normalizePriceToCOP } from "../../src/utils/budget.js";

describe("presupuesto normalizado a COP", () => {
  it("clasifica los límites de COP", () => {
    expect(getBudgetLevel(150_000, "COP")).toBe("Económico");
    expect(getBudgetLevel(150_001, "COP")).toBe("Moderado");
    expect(getBudgetLevel(300_000, "COP")).toBe("Moderado");
    expect(getBudgetLevel(300_001, "COP")).toBe("Alto");
    expect(getBudgetLevel(500_000, "COP")).toBe("Alto");
    expect(getBudgetLevel(500_001, "COP")).toBe("Lujo");
  });

  it("clasifica los ejemplos de cada nivel y el precio gratuito", () => {
    expect(getBudgetLevel(100_000, "COP")).toBe("Económico");
    expect(getBudgetLevel(200_000, "COP")).toBe("Moderado");
    expect(getBudgetLevel(240_000, "COP")).toBe("Moderado");
    expect(getBudgetLevel(400_000, "COP")).toBe("Alto");
    expect(getBudgetLevel(650_000, "COP")).toBe("Lujo");
    expect(getBudgetLevel(0, "COP")).toBe("Económico");
  });

  it("convierte USD antes de clasificar y no compara el número original", () => {
    const cop = normalizePriceToCOP(80, "USD");
    expect(cop).toBe(80 * FALLBACK_USD_TO_COP);
    expect(cop).toBeGreaterThan(BUDGET_LIMITS_COP.economico);
    expect(getBudgetLevel(80, "USD")).toBe(getBudgetLevel(cop!, "COP"));
    expect(getBudgetLevel(80, "USD")).not.toBe("Económico");
  });

  it("no inventa un nivel si la moneda no tiene tasa", () => {
    expect(normalizePriceToCOP(80, "GBP")).toBeNull();
    expect(getBudgetLevel(80, "GBP")).toBeNull();
  });

  it("usa los mismos nombres que Mis preferencias", () => {
    expect(ONBOARDING_BUDGETS).toEqual(["Económico", "Moderado", "Alto", "Lujo"]);
  });
});
