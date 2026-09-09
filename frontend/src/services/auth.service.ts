import axios from "axios";
import { api, clearSession, getAccessToken, refreshAccessToken, setAccessToken, setStoredUser } from "./api";
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
  if (data.data.user) {
    setStoredUser(data.data.user);
  }
  return data.data;
}

export async function loginAccount(payload: { email: string; password: string }) {
  const { data } = await api.post<ApiResponse<{ user: PublicUser; accessToken: string }>>(
    "/auth/login",
    payload,
  );
  setAccessToken(data.data.accessToken);
  setStoredUser(data.data.user);
  return data.data;
}

export async function logoutAccount() {
  try {
    await api.post("/auth/logout", undefined, { skipAuthRefresh: true });
  } finally {
    clearSession();
  }
}

export async function getMe() {
  const { data } = await api.get<ApiResponse<{ user: PublicUser }>>("/auth/me");
  setStoredUser(data.data.user);
  return data.data.user;
}

export async function restoreSession() {
  if (!getAccessToken()) {
    await refreshAccessToken({ silent: true });
  }
  if (!getAccessToken()) {
    return null;
  }
  try {
    return await getMe();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<ApiResponse<{ accepted: boolean; devToken?: string }>>(
    "/auth/forgot-password",
    { email },
  );
  return data;
}

export async function resetPassword(token: string, password: string, confirmPassword: string) {
  const { data } = await api.post("/auth/reset-password", { token, password, confirmPassword });
  return data;
}

export async function verifyEmailAccount(payload: { email: string; code: string }) {
  const { data } = await api.post<ApiResponse<{ user: PublicUser; accessToken?: string }>>(
    "/auth/verify-email",
    payload,
  );
  if (data.data.accessToken) {
    setAccessToken(data.data.accessToken);
  }
  if (data.data.user) {
    setStoredUser(data.data.user);
  }
  return data.data;
}

export async function resendVerificationCode(email: string) {
  const { data } = await api.post<ApiResponse<{ accepted: boolean; devCode?: string }>>(
    "/auth/resend-verification-code",
    { email },
  );
  return data;
}
