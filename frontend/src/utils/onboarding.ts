import type { PublicUser, UserOnboardingProfile } from "../types";
import {
  DEFAULT_AVATAR_CONFIG,
  PRIMARY_INTEREST_VALUES,
  canonicalizeInterest,
  parseAvatarConfig,
} from "../data/onboarding";
import { COLOMBIA_DEPARTMENTS, findDepartment, findMunicipality } from "../data/colombia-locations";

export const ONBOARDING_STEPS = [
  { id: "ubicacion", label: "Ubicación" },
  { id: "perfil", label: "Tu perfil" },
  { id: "intereses", label: "Intereses" },
  { id: "compania", label: "Compañía" },
  { id: "preferencias", label: "Preferencias" },
  { id: "resumen", label: "Resumen" },
] as const;

export const PRIMARY_INTEREST_MIN = 3;
export const PRIMARY_INTEREST_MAX = 5;
export const ONBOARDING_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ONBOARDING_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type OnboardingForm = {
  country: string;
  department: string;
  city: string;
  neighborhood: string;
  addressReference: string;
  latitude: number | null;
  longitude: number | null;
  profileImageType: "PHOTO" | "AVATAR";
  profileImageUrl: string | null;
  localPhotoUrl: string | null;
  avatarConfig: ReturnType<typeof parseAvatarConfig>;
  interests: string[];
  companions: string[];
  places: string[];
  music: string[];
  budget: string[];
  climate: string[];
};

export const emptyOnboardingForm = (): OnboardingForm => ({
  country: "Colombia",
  department: "",
  city: "",
  neighborhood: "",
  addressReference: "",
  latitude: null,
  longitude: null,
  profileImageType: "AVATAR",
  profileImageUrl: null,
  localPhotoUrl: null,
  avatarConfig: DEFAULT_AVATAR_CONFIG,
  interests: [],
  companions: [],
  places: [],
  music: [],
  budget: [],
  climate: [],
});

export function profileToForm(profile?: UserOnboardingProfile | null): OnboardingForm {
  const base = emptyOnboardingForm();
  if (!profile) {
    return base;
  }
  const department = profile.department ?? "";
  const city = findMunicipality(department, profile.city ?? "") || profile.city || "";
  return {
    country: profile.country || "Colombia",
    department: findDepartment(department)?.name || department,
    city,
    neighborhood: profile.neighborhood ?? "",
    addressReference: profile.addressReference ?? "",
    latitude: profile.latitude,
    longitude: profile.longitude,
    profileImageType: profile.profileImageType === "PHOTO" ? "PHOTO" : "AVATAR",
    profileImageUrl: profile.profileImageUrl,
    localPhotoUrl: null,
    avatarConfig: parseAvatarConfig(profile.avatarConfig),
    interests: uniqueCanonical(profile.interests),
    companions: [...new Set(profile.companions)],
    places: [...new Set(profile.places)],
    music: [...new Set(profile.music)],
    budget: [...new Set(profile.budget)],
    climate: [...new Set(profile.climate)],
  };
}

export function uniqueCanonical(values: string[]) {
  const next: string[] = [];
  for (const value of values) {
    const mapped = canonicalizeInterest(value);
    if (PRIMARY_INTEREST_VALUES.includes(mapped) && !next.includes(mapped)) {
      next.push(mapped);
    }
  }
  return next;
}

export function citiesForDepartment(department: string) {
  return findDepartment(department)?.cities ?? [];
}

export function applyCountryChange(form: OnboardingForm, country: string): OnboardingForm {
  return {
    ...form,
    country,
    department: "",
    city: "",
    latitude: null,
    longitude: null,
  };
}

export function applyDepartmentChange(form: OnboardingForm, department: string): OnboardingForm {
  const cities = citiesForDepartment(department);
  return {
    ...form,
    department,
    city: cities.includes(form.city) ? form.city : "",
    latitude: findDepartment(department)?.lat ?? null,
    longitude: findDepartment(department)?.lng ?? null,
  };
}

export function applyCityChange(form: OnboardingForm, city: string): OnboardingForm {
  return { ...form, city };
}

export function isLocationComplete(form: OnboardingForm) {
  return Boolean(form.country.trim() && form.department.trim() && form.city.trim());
}

export function isPhotoStepComplete(form: OnboardingForm) {
  if (form.profileImageType === "PHOTO") {
    return Boolean(form.profileImageUrl || form.localPhotoUrl);
  }
  return Boolean(form.avatarConfig);
}

export function countPrimaryInterests(interests: string[]) {
  return uniqueCanonical(interests).length;
}

export function toggleMulti(current: string[], value: string, max?: number) {
  if (current.includes(value)) {
    return { next: current.filter((item) => item !== value), limited: false };
  }
  if (max && current.length >= max) {
    return { next: current, limited: true };
  }
  return { next: [...current, value], limited: false };
}

export function toggleSingle(current: string[], value: string) {
  return current.includes(value) ? [] : [value];
}

export function needsOnboarding(user: PublicUser | null | undefined) {
  if (!user || user.role !== "USER") {
    return false;
  }
  if (!user.profile) {
    return false;
  }
  return !user.profile.onboardingCompleted;
}

export function getOnboardingResumePath() {
  return "/onboarding";
}

export function getOnboardingResumeStep(form: OnboardingForm) {
  if (!isLocationComplete(form)) {
    return 1;
  }
  const passedProfile =
    Boolean(form.profileImageUrl) || countPrimaryInterests(form.interests) > 0 || form.companions.length > 0;
  if (!passedProfile) {
    return 2;
  }
  if (countPrimaryInterests(form.interests) < PRIMARY_INTEREST_MIN) {
    return 3;
  }
  if (form.companions.length < 1) {
    return 4;
  }
  return 5;
}

export function getOnboardingFirstName(sessionName?: string) {
  const first = (sessionName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || /^(tierra|viajero|usuario|user)$/i.test(first)) {
    return "";
  }
  return first;
}

export function validateOnboardingPhoto(file: File) {
  if (!ONBOARDING_PHOTO_TYPES.includes(file.type as (typeof ONBOARDING_PHOTO_TYPES)[number])) {
    return "Usa una imagen JPG, PNG o WebP.";
  }
  if (file.size > ONBOARDING_PHOTO_MAX_BYTES) {
    return "La foto no puede superar 5 MB.";
  }
  return "";
}

export function locationSummary(form: OnboardingForm) {
  return [form.neighborhood, form.city, form.department].filter((item) => item.trim()).join(" · ");
}

export function toOnboardingPayload(form: OnboardingForm, completed = false) {
  return {
    country: form.country || undefined,
    department: form.department.trim() || undefined,
    city: form.city.trim() || undefined,
    neighborhood: form.neighborhood.trim() || undefined,
    addressReference: form.addressReference.trim() || undefined,
    latitude: form.latitude,
    longitude: form.longitude,
    profileImageType: form.profileImageType,
    avatarConfig: form.avatarConfig,
    interests: uniqueCanonical(form.interests),
    companions: [...new Set(form.companions)],
    places: [...new Set(form.places)],
    music: [...new Set(form.music)],
    budget: [...new Set(form.budget)],
    climate: [...new Set(form.climate)],
    completed,
  };
}

export function departmentsList() {
  return COLOMBIA_DEPARTMENTS.map((item) => item.name);
}

export function resetOnboarding(_partial?: { name?: string; userId?: string }) {
  return emptyOnboardingForm();
}

export function saveOnboarding(_partial?: unknown) {
  return emptyOnboardingForm();
}

export function getOnboarding() {
  return { name: "", userId: "", completed: false };
}

export function isOnboardingPending(user: PublicUser | null | undefined) {
  return needsOnboarding(user);
}
