/** Misma lista y las mismas reglas que backend/src/utils/profile-phone.ts. */
export const PROFILE_DIAL_CODES = [
  { code: "57", label: "Colombia" },
  { code: "1", label: "Estados Unidos / Canadá" },
  { code: "52", label: "México" },
  { code: "34", label: "España" },
  { code: "54", label: "Argentina" },
  { code: "56", label: "Chile" },
  { code: "51", label: "Perú" },
  { code: "593", label: "Ecuador" },
  { code: "55", label: "Brasil" },
] as const;

const DIAL_BY_LENGTH = [...PROFILE_DIAL_CODES].sort((left, right) => right.code.length - left.code.length);

const NATIONAL_LENGTH: Record<string, { min: number; max: number }> = {
  "1": { min: 10, max: 10 },
  "52": { min: 10, max: 10 },
  "34": { min: 9, max: 9 },
  "54": { min: 10, max: 10 },
  "56": { min: 9, max: 9 },
  "51": { min: 9, max: 9 },
  "593": { min: 9, max: 9 },
  "55": { min: 10, max: 11 },
};

const COLOMBIA_PHONE_MESSAGE =
  "Ingresa un celular de 10 dígitos que empiece por 3, o un fijo de 10 dígitos que empiece por 60. Ejemplo: 300 123 4567.";

export function isColombianNationalNumber(digits: string) {
  return /^3\d{9}$/.test(digits) || /^60\d{8}$/.test(digits);
}

export function nationalPhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatNationalPhone(digits: string) {
  const groups = digits.match(/.{1,3}/g);
  return groups ? groups.join(" ") : "";
}

export function parseStoredPhone(value: string | null | undefined) {
  const compact = (value ?? "").replace(/[\s.-]/g, "");
  if (!compact) {
    return { dialCode: "57", national: "" };
  }
  if (compact.startsWith("+")) {
    const digits = compact.slice(1).replace(/\D/g, "");
    const dial = DIAL_BY_LENGTH.find((item) => digits.startsWith(item.code));
    if (dial) {
      return { dialCode: dial.code, national: digits.slice(dial.code.length) };
    }
  }
  const digits = compact.replace(/\D/g, "");
  if (isColombianNationalNumber(digits)) {
    return { dialCode: "57", national: digits };
  }
  return { dialCode: "57", national: digits };
}

/** E.164 compacto. Vacío se guarda como null. Cabe en el campo de texto actual. */
export function phoneStorageValue(dialCode: string, nationalDigits: string) {
  if (!nationalDigits) {
    return null;
  }
  return `+${dialCode}${nationalDigits}`;
}

export function formatStoredPhone(value: string | null | undefined) {
  const parsed = parseStoredPhone(value);
  if (!parsed.national) {
    return "";
  }
  return `+${parsed.dialCode} ${formatNationalPhone(parsed.national)}`;
}

function lengthMessage(label: string, min: number, max: number) {
  if (min === max) {
    return `El número de ${label} debe tener ${min} dígitos.`;
  }
  return `El número de ${label} debe tener entre ${min} y ${max} dígitos.`;
}

export function validateDialPhone(dialCode: string, nationalRaw: string) {
  if (/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(nationalRaw)) {
    return "El número solo puede contener números.";
  }
  const digits = nationalPhoneDigits(nationalRaw);
  if (!digits) {
    return "";
  }
  const dial = PROFILE_DIAL_CODES.find((item) => item.code === dialCode);
  if (!dial) {
    return "El número de teléfono no es válido.";
  }
  if (dial.code === "57") {
    return isColombianNationalNumber(digits) ? "" : COLOMBIA_PHONE_MESSAGE;
  }
  const length = NATIONAL_LENGTH[dial.code];
  if (!length || digits.length < length.min || digits.length > length.max) {
    return lengthMessage(dial.label, length?.min ?? 0, length?.max ?? 0);
  }
  return "";
}
