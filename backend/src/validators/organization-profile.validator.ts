import { z } from "zod";

function emptyToNull(value: unknown) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

function optionalText(max: number, message: string) {
  return z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(max, message), z.null()]).optional(),
  );
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function compactPhone(value: string) {
  const compact = value.replace(/[\s.-]/g, "");
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\+/g, "")}`;
  }
  return compact.replace(/\+/g, "");
}

function isValidColombianPhone(value: string) {
  const compact = compactPhone(value);
  if (!compact) {
    return false;
  }
  const national = compact.startsWith("+57") ? compact.slice(3) : compact.startsWith("+") ? compact.slice(1) : compact;
  return /^3\d{9}$/.test(national) || /^60\d{8}$/.test(national);
}

export const organizationProfileUpsertSchema = z.object({
  tradeName: optionalText(120, "El nombre comercial es demasiado largo"),
  legalName: optionalText(160, "La razón social es demasiado larga"),
  description: optionalText(2000, "La descripción es demasiado larga"),
  logoUrl: optionalText(700, "La URL del logo no es válida"),
  contactPhone: optionalText(20, "El teléfono es demasiado largo").refine(
    (value) => value === undefined || value === null || isValidColombianPhone(value),
    "Ingresa un teléfono colombiano válido. Ejemplo: 300 123 4567",
  ),
  contactEmail: optionalText(120, "El correo público es demasiado largo").refine(
    (value) => value === undefined || value === null || z.string().email().safeParse(value).success,
    "Ingresa un correo público válido",
  ),
  website: z.preprocess(
    emptyToNull,
    z
      .union([
        z
          .string()
          .trim()
          .max(300, "El sitio web es demasiado largo")
          .transform(normalizeWebsite)
          .refine(isValidWebsite, "Ingresa un sitio web válido"),
        z.null(),
      ])
      .optional(),
  ),
  department: optionalText(80, "El departamento es demasiado largo"),
  city: optionalText(80, "El municipio es demasiado largo"),
  address: optionalText(200, "La dirección es demasiado larga"),
});

export type OrganizationProfileUpsertInput = z.infer<typeof organizationProfileUpsertSchema>;
