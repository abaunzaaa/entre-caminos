export type OrganizationProfileDraft = {
  tradeName: string;
  legalName: string;
  description: string;
  logoUrl: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  department: string;
  city: string;
  address: string;
};

export type OrganizationProfileFieldErrors = Partial<Record<keyof OrganizationProfileDraft, string>>;

export const EMPTY_ORG_PROFILE_DRAFT: OrganizationProfileDraft = {
  tradeName: "",
  legalName: "",
  description: "",
  logoUrl: "",
  contactPhone: "",
  contactEmail: "",
  website: "",
  department: "",
  city: "",
  address: "",
};

const REQUIRED_LABELS: Array<{ key: keyof OrganizationProfileDraft; label: string }> = [
  { key: "tradeName", label: "Nombre comercial" },
  { key: "description", label: "Descripción de la empresa" },
  { key: "contactPhone", label: "Teléfono público de contacto" },
  { key: "department", label: "Departamento" },
  { key: "city", label: "Municipio" },
];

function compactPhone(value: string) {
  const compact = value.replace(/[\s.-]/g, "");
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\+/g, "")}`;
  }
  return compact.replace(/\+/g, "");
}

export function formatOrgPhoneDisplay(value: string) {
  const compact = compactPhone(value);
  if (!compact) {
    return "";
  }
  if (compact === "+" || compact === "+5" || compact === "+57") {
    return compact;
  }
  const hasCountry = compact.startsWith("+57");
  const national = hasCountry ? compact.slice(3) : compact.startsWith("+") ? compact.slice(1) : compact;
  if (/^3\d{0,9}$/.test(national) || /^60\d{0,8}$/.test(national)) {
    const groups = [national.slice(0, 3), national.slice(3, 6), national.slice(6, 10)].filter(Boolean);
    return `${hasCountry ? "+57 " : ""}${groups.join(" ")}`;
  }
  return compact;
}

export function isValidOrgPhone(value: string) {
  const compact = compactPhone(value);
  if (!compact) {
    return false;
  }
  const national = compact.startsWith("+57")
    ? compact.slice(3)
    : compact.startsWith("+")
      ? compact.slice(1)
      : compact;
  return /^3\d{9}$/.test(national) || /^60\d{8}$/.test(national);
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(normalizeWebsite(value));
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function getOrganizationProfileMissingFields(draft: OrganizationProfileDraft) {
  return REQUIRED_LABELS.filter(({ key }) => !draft[key].trim()).map(({ label }) => label);
}

export function validateOrganizationProfileDraft(
  draft: OrganizationProfileDraft,
): OrganizationProfileFieldErrors {
  const errors: OrganizationProfileFieldErrors = {};
  if (draft.tradeName.trim().length > 120) {
    errors.tradeName = "El nombre comercial es demasiado largo";
  }
  if (draft.legalName.trim().length > 160) {
    errors.legalName = "La razón social es demasiado larga";
  }
  if (draft.description.trim().length > 2000) {
    errors.description = "La descripción es demasiado larga";
  }
  if (draft.contactPhone.trim() && !isValidOrgPhone(draft.contactPhone)) {
    errors.contactPhone = "Ingresa un teléfono colombiano válido. Ejemplo: 300 123 4567";
  }
  if (draft.contactEmail.trim()) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim());
    if (!ok) {
      errors.contactEmail = "Ingresa un correo público válido";
    }
  }
  if (draft.website.trim() && !isValidWebsite(draft.website)) {
    errors.website = "Ingresa un sitio web válido";
  }
  if (draft.address.trim().length > 200) {
    errors.address = "La dirección es demasiado larga";
  }
  return errors;
}

export function toOrganizationProfilePayload(draft: OrganizationProfileDraft) {
  return {
    tradeName: draft.tradeName.trim() || null,
    legalName: draft.legalName.trim() || null,
    description: draft.description.trim() || null,
    logoUrl: draft.logoUrl.trim() || null,
    contactPhone: draft.contactPhone.trim() || null,
    contactEmail: draft.contactEmail.trim() || null,
    website: draft.website.trim() ? normalizeWebsite(draft.website) : null,
    department: draft.department.trim() || null,
    city: draft.city.trim() || null,
    address: draft.address.trim() || null,
  };
}
