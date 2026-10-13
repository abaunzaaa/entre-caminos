/** Códigos que el perfil puede guardar en el mismo campo de texto, sin cambiar el modelo. */
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

export function isColombianNationalNumber(digits: string) {
  return /^3\d{9}$/.test(digits) || /^60\d{8}$/.test(digits);
}

const COLOMBIA_PHONE_MESSAGE =
  "Ingresa un celular de 10 dígitos que empiece por 3, o un fijo de 10 dígitos que empiece por 60. Ejemplo: 300 123 4567.";

function nationalLengthMessage(label: string, min: number, max: number) {
  if (min === max) {
    return `El número de ${label} debe tener ${min} dígitos.`;
  }
  return `El número de ${label} debe tener entre ${min} y ${max} dígitos.`;
}

/** Mensaje vacío si el teléfono puede guardarse. Vacío es válido: el campo es opcional. */
export function profilePhoneError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]/.test(trimmed)) {
    return "El número solo puede contener números.";
  }
  const compact = trimmed.replace(/[\s.-]/g, "");
  if (!/^\+?\d+$/.test(compact)) {
    return "El número solo puede contener números.";
  }

  if (compact.startsWith("+")) {
    const digits = compact.slice(1);
    const dial = DIAL_BY_LENGTH.find((item) => digits.startsWith(item.code));
    if (!dial) {
      return "El número de teléfono no es válido.";
    }
    const national = digits.slice(dial.code.length);
    if (dial.code === "57") {
      return isColombianNationalNumber(national) ? "" : COLOMBIA_PHONE_MESSAGE;
    }
    const length = NATIONAL_LENGTH[dial.code];
    if (!length || national.length < length.min || national.length > length.max) {
      return nationalLengthMessage(dial.label, length?.min ?? 0, length?.max ?? 0);
    }
    return "";
  }

  return isColombianNationalNumber(compact) ? "" : COLOMBIA_PHONE_MESSAGE;
}
