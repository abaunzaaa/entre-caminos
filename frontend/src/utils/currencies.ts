export const EXPERIENCE_CURRENCIES = [
  { code: "COP", label: "COP - Peso colombiano" },
  { code: "USD", label: "USD - Dólar estadounidense" },
  { code: "EUR", label: "EUR - Euro" },
] as const;

export type ExperienceCurrency = (typeof EXPERIENCE_CURRENCIES)[number]["code"];

export function isExperienceCurrency(value: string): value is ExperienceCurrency {
  return EXPERIENCE_CURRENCIES.some((item) => item.code === value);
}
