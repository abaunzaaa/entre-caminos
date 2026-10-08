import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXCHANGE_RATE_CACHE_TTL_MS,
  FALLBACK_EUR_TO_COP,
  FALLBACK_USD_TO_COP,
  ensureCopRates,
  rateToCop,
  resetExchangeRatesForTests,
  setExchangeRateFetcherForTests,
} from "../../src/config/exchange-rates.js";
import { filterCatalogItems, type CatalogListItem } from "../../src/services/public-catalog.js";
import { getBudgetLevel, normalizePriceToCOP } from "../../src/utils/budget.js";
import { logger } from "../../src/utils/logger.js";

const START = 1_700_000_000_000;

function payload(cop: number, eurPerUsd: number) {
  return {
    result: "success",
    base_code: "USD",
    rates: { USD: 1, EUR: eurPerUsd, COP: cop },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function item(partial: Partial<CatalogListItem> & Pick<CatalogListItem, "id" | "title" | "price" | "currency">): CatalogListItem {
  return {
    description: "",
    categoryId: "cat-1",
    categoryName: "Cultural",
    location: "Centro, Medellín, Antioquia",
    duration: null,
    durationValue: 2,
    durationUnit: "HOURS",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("tasas USD/EUR con caché", () => {
  let calls = 0;

  beforeEach(() => {
    calls = 0;
    resetExchangeRatesForTests();
    vi.spyOn(logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    resetExchangeRatesForTests();
    setExchangeRateFetcherForTests(null);
    vi.restoreAllMocks();
  });

  function useFetcher(fetcher: () => Promise<Response> | Response) {
    setExchangeRateFetcherForTests(async () => {
      calls += 1;
      return fetcher();
    });
  }

  it("no llama a la API si la caché sigue vigente", async () => {
    useFetcher(() => json(payload(4000, 0.8)));

    await ensureCopRates(START);
    await ensureCopRates(START + 60 * 60 * 1000);
    await ensureCopRates(START + EXCHANGE_RATE_CACHE_TTL_MS - 1);

    expect(calls).toBe(1);
  });

  it("consulta la API una sola vez cuando la caché vence", async () => {
    useFetcher(() => json(payload(4100, 0.5)));

    await ensureCopRates(START);
    await ensureCopRates(START + EXCHANGE_RATE_CACHE_TTL_MS);
    await ensureCopRates(START + EXCHANGE_RATE_CACHE_TTL_MS);

    expect(calls).toBe(2);
    expect(rateToCop("USD")).toBe(4100);
  });

  it("guarda y usa la tasa que responde la API", async () => {
    useFetcher(() => json(payload(3800, 0.5)));

    const rates = await ensureCopRates(START);

    expect(rates).toEqual({ USD: 3800, EUR: 7600 });
    expect(rateToCop("USD")).toBe(3800);
    expect(rateToCop("EUR")).toBe(7600);
    expect(calls).toBe(1);
  });

  it("si la API falla conserva la última tasa válida", async () => {
    useFetcher(() => json(payload(3900, 0.5)));
    await ensureCopRates(START);

    let failures = 0;
    setExchangeRateFetcherForTests(async () => {
      failures += 1;
      throw new Error("caída");
    });
    const rates = await ensureCopRates(START + EXCHANGE_RATE_CACHE_TTL_MS);

    expect(rates).toEqual({ USD: 3900, EUR: 7800 });
    expect(rateToCop("USD")).toBe(3900);
    expect(failures).toBe(1);
  });

  it("si la API falla y no hay tasa previa usa 4000 y 4300", async () => {
    useFetcher(() => {
      throw new Error("caída");
    });

    const rates = await ensureCopRates(START);

    expect(rates).toEqual({ USD: FALLBACK_USD_TO_COP, EUR: FALLBACK_EUR_TO_COP });
    expect(rateToCop("USD")).toBe(4000);
    expect(rateToCop("EUR")).toBe(4300);
    expect(normalizePriceToCOP(80, "USD")).toBe(80 * 4000);
  });

  it("convierte 80 USD y un precio en EUR con la tasa obtenida, y deja COP igual", async () => {
    useFetcher(() => json(payload(4000, 0.5)));
    await ensureCopRates(START);

    expect(normalizePriceToCOP(80, "USD")).toBe(320_000);
    expect(normalizePriceToCOP(80, "USD")).not.toBe(80);
    expect(getBudgetLevel(80, "USD")).toBe("Alto");
    expect(normalizePriceToCOP(100, "EUR")).toBe(800_000);
    expect(getBudgetLevel(100, "EUR")).toBe("Lujo");
    expect(normalizePriceToCOP(150_000, "COP")).toBe(150_000);
    expect(getBudgetLevel(150_000, "COP")).toBe("Económico");
    expect(normalizePriceToCOP(80, "GBP")).toBeNull();
  });

  it("reutiliza la misma consulta si varias peticiones vencen juntas", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    useFetcher(async () => {
      await gate;
      return json(payload(4000, 0.5));
    });

    const first = ensureCopRates(START);
    const second = ensureCopRates(START);
    release?.();
    const [left, right] = await Promise.all([first, second]);

    expect(calls).toBe(1);
    expect(left).toEqual(right);
    expect(left.USD).toBe(4000);
  });

  it("cambiar el filtro varias veces no vuelve a llamar a la API", async () => {
    useFetcher(() => json(payload(4000, 0.8)));
    const catalog = [
      item({ id: "eco", title: "Eco", price: 150_000, currency: "COP" }),
      item({ id: "mod", title: "Mod", price: 300_000, currency: "COP" }),
      item({ id: "alto", title: "Alto", price: 500_000, currency: "COP" }),
      item({ id: "lujo", title: "Lujo", price: 500_001, currency: "COP" }),
      item({ id: "usd", title: "Dólares", price: 80, currency: "USD" }),
    ];

    const bands = ["Económico", "Moderado", "Alto", "Lujo", ""] as const;
    const matched: string[][] = [];
    for (const price of bands) {
      await ensureCopRates(START);
      matched.push(filterCatalogItems(catalog, { price }).map((entry) => entry.id));
    }

    expect(calls).toBe(1);
    expect(matched).toEqual([
      ["eco"],
      ["mod"],
      ["alto", "usd"],
      ["lujo"],
      ["eco", "mod", "alto", "lujo", "usd"],
    ]);
  });

  it("mantiene los rangos de presupuesto en COP", () => {
    expect(getBudgetLevel(150_000, "COP")).toBe("Económico");
    expect(getBudgetLevel(300_000, "COP")).toBe("Moderado");
    expect(getBudgetLevel(500_000, "COP")).toBe("Alto");
    expect(getBudgetLevel(500_001, "COP")).toBe("Lujo");
  });
});
