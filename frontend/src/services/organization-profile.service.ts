import { api } from "./api";
import type { ApiResponse } from "../types";

export type OrganizationProfile = {
  id: string;
  userId: string;
  tradeName: string | null;
  legalName: string | null;
  description: string | null;
  logoUrl: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
  department: string | null;
  city: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  complete: boolean;
  missingFields: string[];
};

export type OrganizationProfileInput = {
  tradeName?: string | null;
  legalName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  department?: string | null;
  city?: string | null;
  address?: string | null;
};

export async function getOwnOrganizationProfile() {
  const { data } = await api.get<ApiResponse<{ profile: OrganizationProfile | null }>>(
    "/admin/organization-profile",
  );
  return data.data.profile;
}

export async function upsertOwnOrganizationProfile(payload: OrganizationProfileInput) {
  const { data } = await api.put<ApiResponse<{ profile: OrganizationProfile }>>(
    "/admin/organization-profile",
    payload,
  );
  return data.data.profile;
}

export async function getOrganizationProfileByUserId(userId: string) {
  const { data } = await api.get<ApiResponse<{ profile: OrganizationProfile | null }>>(
    `/admin/organization-profiles/${userId}`,
  );
  return data.data.profile;
}

export async function upsertOrganizationProfileByUserId(
  userId: string,
  payload: OrganizationProfileInput,
) {
  const { data } = await api.put<ApiResponse<{ profile: OrganizationProfile }>>(
    `/admin/organization-profiles/${userId}`,
    payload,
  );
  return data.data.profile;
}
