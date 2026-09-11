import { api } from "./api";
import type { ApiResponse, UserOnboardingProfile } from "../types";
import type { OnboardingForm } from "../utils/onboarding";
import { toOnboardingPayload } from "../utils/onboarding";

export async function saveOnboardingProfile(form: OnboardingForm, completed = false) {
  const { data } = await api.patch<ApiResponse<{ profile: UserOnboardingProfile }>>(
    "/auth/onboarding",
    toOnboardingPayload(form, completed),
  );
  return data.data.profile;
}

export async function uploadOnboardingPhoto(file: File) {
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.post<ApiResponse<{ profile: UserOnboardingProfile }>>("/auth/onboarding/photo", form);
  return data.data.profile;
}

export async function deleteOnboardingPhoto() {
  const { data } = await api.delete<ApiResponse<{ profile: UserOnboardingProfile }>>("/auth/onboarding/photo");
  return data.data.profile;
}
