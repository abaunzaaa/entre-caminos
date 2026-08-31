import { api, setAccessToken } from "./api";
import type { ApiResponse, PublicUser } from "../types";

export async function registerAccount(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}) {
  const { data } = await api.post<
    ApiResponse<{ user: PublicUser; accessToken?: string; verificationEmailSent?: boolean }>
  >("/auth/register", payload);
  if (data.data.accessToken) {
    setAccessToken(data.data.accessToken);
  }
  return data.data;
}

export async function loginAccount(payload: { email: string; password: string }) {
  const { data } = await api.post<ApiResponse<{ user: PublicUser; accessToken: string }>>(
    "/auth/login",
    payload,
  );
  setAccessToken(data.data.accessToken);
  return data.data;
}

export async function logoutAccount() {
  await api.post("/auth/logout");
  setAccessToken(null);
}

export async function getMe() {
  const { data } = await api.get<ApiResponse<{ user: PublicUser }>>("/auth/me");
  return data.data.user;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<ApiResponse<{ accepted: boolean; devToken?: string }>>(
    "/auth/forgot-password",
    { email },
  );
  return data;
}

export async function resetPassword(token: string, password: string) {
  const { data } = await api.post("/auth/reset-password", { token, password });
  return data;
}
