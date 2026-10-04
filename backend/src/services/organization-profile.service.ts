import type { OrganizationProfile, Role } from "@prisma/client";
import { ROLES } from "../config/constants.js";
import { prisma } from "../database/prisma.js";
import type { AuthUser } from "../models/auth-user.js";
import { ApiError } from "../utils/api-error.js";
import { isSuperAdmin } from "../utils/permissions.js";
import { recordAudit } from "./audit.service.js";
import type { OrganizationProfileUpsertInput } from "../validators/organization-profile.validator.js";

export type OrganizationProfileRecord = OrganizationProfile;

export type PublicOrganizationProfile = {
  tradeName: string;
  description: string;
  logoUrl: string | null;
  department: string;
  city: string;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  address: string | null;
};

export type OrganizationProfileCompleteness = {
  complete: boolean;
  missing: string[];
};

const REQUIRED_LABELS: Record<string, string> = {
  tradeName: "Nombre comercial",
  description: "Descripción de la empresa",
  contactChannel: "Teléfono público de contacto o sitio web / canal oficial de atención",
  department: "Departamento",
  city: "Municipio",
};

function hasValidOfficialWebsite(website: string | null | undefined) {
  const trimmed = website?.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function hasPublicContactChannel(profile: Partial<OrganizationProfile> | null | undefined) {
  return Boolean(profile?.contactPhone?.trim()) || hasValidOfficialWebsite(profile?.website);
}

export function getOrganizationProfileCompleteness(
  profile: Partial<OrganizationProfile> | null | undefined,
): OrganizationProfileCompleteness {
  const missing: string[] = [];
  if (!profile?.tradeName?.trim()) {
    missing.push(REQUIRED_LABELS.tradeName);
  }
  if (!profile?.description?.trim()) {
    missing.push(REQUIRED_LABELS.description);
  }
  if (!hasPublicContactChannel(profile)) {
    missing.push(REQUIRED_LABELS.contactChannel);
  }
  if (!profile?.department?.trim()) {
    missing.push(REQUIRED_LABELS.department);
  }
  if (!profile?.city?.trim()) {
    missing.push(REQUIRED_LABELS.city);
  }
  return { complete: missing.length === 0, missing };
}

export function isOrganizationProfileComplete(profile: Partial<OrganizationProfile> | null | undefined) {
  return getOrganizationProfileCompleteness(profile).complete;
}

function publicOrganizationFields(
  profile: OrganizationProfile,
  tradeName: string,
): PublicOrganizationProfile {
  return {
    tradeName,
    description: profile.description?.trim() || "",
    logoUrl: profile.logoUrl?.trim() || null,
    department: profile.department?.trim() || "",
    city: profile.city?.trim() || "",
    contactPhone: profile.contactPhone?.trim() || null,
    contactEmail: profile.contactEmail?.trim() || null,
    website: profile.website?.trim() || null,
    address: profile.address?.trim() || null,
  };
}

export function toPublicOrganizationProfile(
  profile: OrganizationProfile | null | undefined,
): PublicOrganizationProfile | null {
  if (!profile || !isOrganizationProfileComplete(profile)) {
    return null;
  }
  return publicOrganizationFields(profile, profile.tradeName!.trim());
}

export function toExperienceDetailOrganization(
  profile: OrganizationProfile | null | undefined,
): PublicOrganizationProfile | null {
  const tradeName = profile?.tradeName?.trim() || "";
  if (!profile || !tradeName) {
    return null;
  }
  return publicOrganizationFields(profile, tradeName);
}

export function serializeOrganizationProfile(profile: OrganizationProfile | null) {
  if (!profile) {
    return null;
  }
  const completeness = getOrganizationProfileCompleteness(profile);
  return {
    id: profile.id,
    userId: profile.userId,
    tradeName: profile.tradeName,
    legalName: profile.legalName,
    description: profile.description,
    logoUrl: profile.logoUrl,
    contactPhone: profile.contactPhone,
    contactEmail: profile.contactEmail,
    website: profile.website,
    department: profile.department,
    city: profile.city,
    address: profile.address,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    complete: completeness.complete,
    missingFields: completeness.missing,
  };
}

async function assertAdminTarget(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user || user.deletedAt) {
    throw ApiError.notFound("Usuario no encontrado");
  }
  if (user.role.name !== ROLES.ADMIN) {
    throw ApiError.badRequest("Solo las cuentas ADMIN pueden tener perfil de organización");
  }
  return user as typeof user & { role: Role };
}

function assertCanAccessProfile(actor: AuthUser, userId: string) {
  if (isSuperAdmin(actor)) {
    return;
  }
  if (actor.role !== ROLES.ADMIN || actor.id !== userId) {
    throw ApiError.forbidden("Solo puedes gestionar el perfil de tu propia organización");
  }
}

export async function getOrganizationProfileForUser(actor: AuthUser, userId: string) {
  assertCanAccessProfile(actor, userId);
  await assertAdminTarget(userId);
  const profile = await prisma.organizationProfile.findUnique({ where: { userId } });
  return serializeOrganizationProfile(profile);
}

export async function getOwnOrganizationProfile(actor: AuthUser) {
  if (actor.role !== ROLES.ADMIN && !isSuperAdmin(actor)) {
    throw ApiError.forbidden("No tienes acceso al perfil de organización");
  }
  if (actor.role === ROLES.ADMIN) {
    return getOrganizationProfileForUser(actor, actor.id);
  }
  // SUPER_ADMIN no tiene perfil propio de organización.
  return null;
}

export async function upsertOrganizationProfile(
  actor: AuthUser,
  userId: string,
  input: OrganizationProfileUpsertInput,
) {
  assertCanAccessProfile(actor, userId);
  await assertAdminTarget(userId);

  // Ignora cualquier intento de cambiar el propietario desde el cliente.
  const data = {
    tradeName: input.tradeName === undefined ? undefined : input.tradeName,
    legalName: input.legalName === undefined ? undefined : input.legalName,
    description: input.description === undefined ? undefined : input.description,
    logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
    contactPhone: input.contactPhone === undefined ? undefined : input.contactPhone,
    contactEmail: input.contactEmail === undefined ? undefined : input.contactEmail?.toLowerCase() ?? null,
    website: input.website === undefined ? undefined : input.website,
    department: input.department === undefined ? undefined : input.department,
    city: input.city === undefined ? undefined : input.city,
    address: input.address === undefined ? undefined : input.address,
  };

  const existing = await prisma.organizationProfile.findUnique({ where: { userId } });
  const profile = existing
    ? await prisma.organizationProfile.update({
        where: { userId },
        data,
      })
    : await prisma.organizationProfile.create({
        data: {
          userId,
          tradeName: data.tradeName ?? null,
          legalName: data.legalName ?? null,
          description: data.description ?? null,
          logoUrl: data.logoUrl ?? null,
          contactPhone: data.contactPhone ?? null,
          contactEmail: data.contactEmail ?? null,
          website: data.website ?? null,
          department: data.department ?? null,
          city: data.city ?? null,
          address: data.address ?? null,
        },
      });

  await recordAudit({
    userId: actor.id,
    action: existing ? "ORGANIZATION_PROFILE_UPDATE" : "ORGANIZATION_PROFILE_CREATE",
    entity: "OrganizationProfile",
    entityId: profile.id,
  });

  return serializeOrganizationProfile(profile);
}

export async function assertAdminCanSubmitExperiences(actor: AuthUser) {
  if (isSuperAdmin(actor) || actor.role !== ROLES.ADMIN) {
    return;
  }
  const profile = await prisma.organizationProfile.findUnique({ where: { userId: actor.id } });
  const completeness = getOrganizationProfileCompleteness(profile);
  if (!completeness.complete) {
    throw ApiError.unprocessable(
      `Completa el perfil de empresa antes de enviar experiencias a revisión. Faltan: ${completeness.missing.join(", ")}.`,
    );
  }
}
