import { logger } from "../utils/logger.js";

/**
 * Tasas internas para clasificar presupuesto. No cambian el precio ni la moneda guardados.
 * Open Access de ExchangeRate-API: una consulta con base USD trae COP y EUR.
 * https://open.er-api.com/v6/latest/USD
 */
export const EXCHANGE_RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const EXCHANGE_RATE_TIMEOUT_MS = 4_000;
export const FALLBACK_USD_TO_COP = 4000;
export const FALLBACK_EUR_TO_COP = 4300;

const OPEN_ACCESS_URL = "https://open.er-api.com/v6/latest/USD";

type CopRates = {
  USD: number;
  EUR: number;
};

type CacheEntry = {
  rates: CopRates;
  updatedAt: number;
};

type RateFetcher = (url: string, init: { signal: AbortSignal }) => Promise<Response>;

const fallbackRates = (): CopRates => ({
  USD: FALLBACK_USD_TO_COP,
  EUR: FALLBACK_EUR_TO_COP,
});

let cache: CacheEntry | null = null;
let refreshPromise: Promise<CopRates> | null = null;
let rateFetcher: RateFetcher = (url, init) => fetch(url, init);

function positive(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function ratesFromUsdBase(payload: unknown): CopRates {
  if (!payload || typeof payload !== "object") {
    throw new Error("respuesta inválida");
  }
  const body = payload as { result?: unknown; base_code?: unknown; rates?: Record<string, unknown> };
  if (body.result !== "success" || body.base_code !== "USD" || !body.rates) {
    throw new Error("respuesta inválida");
  }
  const usdToCop = positive(body.rates.COP);
  const usdToEur = positive(body.rates.EUR);
  if (usdToCop == null || usdToEur == null) {
    throw new Error("tasas inválidas");
  }
  const eurToCop = usdToCop / usdToEur;
  if (!Number.isFinite(eurToCop) || eurToCop <= 0) {
    throw new Error("tasa EUR inválida");
  }
  return { USD: usdToCop, EUR: eurToCop };
}

async function fetchCopRates() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXCHANGE_RATE_TIMEOUT_MS);
  try {
    const response = await rateFetcher(OPEN_ACCESS_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`http ${response.status}`);
    }
    return ratesFromUsdBase(await response.json());
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("timeout");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function isFresh(now: number) {
  return cache != null && now - cache.updatedAt < EXCHANGE_RATE_CACHE_TTL_MS;
}

async function refreshCopRates(now: number): Promise<CopRates> {
  try {
    const rates = await fetchCopRates();
    cache = { rates, updatedAt: now };
    return rates;
  } catch (error) {
    logger.warn("No se pudo actualizar la tasa USD/EUR. Se usa la última tasa válida o el respaldo.", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return cache?.rates ?? fallbackRates();
  }
}

/** Devuelve la tasa en caché si sigue vigente. Solo consulta la API si venció o no existe. */
export async function ensureCopRates(now = Date.now()) {
  if (isFresh(now)) {
    return cache!.rates;
  }
  if (!refreshPromise) {
    refreshPromise = refreshCopRates(now).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Tasa actual hacia COP. COP no pasa por aquí. Una moneda sin tasa devuelve undefined. */
export function rateToCop(currency: string) {
  const code = currency.trim().toUpperCase();
  const rates = cache?.rates ?? fallbackRates();
  if (code === "USD" || code === "EUR") {
    return rates[code];
  }
  return undefined;
}

export function resetExchangeRatesForTests() {
  cache = null;
  refreshPromise = null;
}

export function setExchangeRateFetcherForTests(fetcher: RateFetcher | null) {
  rateFetcher = fetcher ?? ((url, init) => fetch(url, init));
}
