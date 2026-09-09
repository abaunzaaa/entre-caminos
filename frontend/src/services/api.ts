import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { PublicUser } from "../types";
import { SESSION_ENDED_MESSAGE } from "../utils/api-error";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}

const TOKEN_KEY = "ec_access_token";
const USER_KEY = "ec_auth_user";
const REMEMBER_KEY = "ec_remember";
const SESSION_FLAG = "ec_session_expired";
const AUTH_EXEMPT =
  /\/auth\/(login|register|refresh|logout|forgot-password|reset-password|verify-email|resend-verification-code|google)(?:\/callback)?(?:\?|$)/;

type RetryConfig = InternalAxiosRequestConfig & {
  skipAuthRefresh?: boolean;
  _retry?: boolean;
};

type SessionListener = () => void;

const sessionListeners = new Set<SessionListener>();
let refreshInFlight: Promise<string | null> | null = null;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true,
});

function readStorage(store: Storage, key: string) {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(store: Storage, key: string, value: string | null) {
  try {
    if (value) {
      store.setItem(key, value);
      return;
    }
    store.removeItem(key);
  } catch {
    /* private mode or disabled storage */
  }
}

export function syncRememberFromLocation() {
  try {
    const remember = new URLSearchParams(window.location.search).get("remember");
    if (remember === "1" || remember === "true") {
      setRememberSession(true);
    } else if (remember === "0" || remember === "false") {
      setRememberSession(false);
    }
  } catch {
    /* ignore */
  }
}

export function setRememberSession(remember: boolean) {
  writeStorage(window.localStorage, REMEMBER_KEY, remember ? "1" : "0");
}

export function shouldRememberSession() {
  const value = readStorage(window.localStorage, REMEMBER_KEY);
  if (value === "0") {
    return false;
  }
  if (value === "1") {
    return true;
  }
  return Boolean(readStorage(window.localStorage, TOKEN_KEY) || readStorage(window.localStorage, USER_KEY));
}

function persistStore() {
  return shouldRememberSession() ? window.localStorage : window.sessionStorage;
}

function otherStore() {
  return shouldRememberSession() ? window.sessionStorage : window.localStorage;
}

export function getAccessToken() {
  return readStorage(window.localStorage, TOKEN_KEY) ?? readStorage(window.sessionStorage, TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  writeStorage(persistStore(), TOKEN_KEY, token);
  writeStorage(otherStore(), TOKEN_KEY, null);
}

export function getStoredUser(): PublicUser | null {
  const raw = readStorage(window.localStorage, USER_KEY) ?? readStorage(window.sessionStorage, USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PublicUser;
    if (parsed && typeof parsed.id === "string" && typeof parsed.email === "string") {
      return parsed;
    }
  } catch {
    /* ignore malformed cache */
  }
  return null;
}

export function setStoredUser(user: PublicUser | null) {
  writeStorage(persistStore(), USER_KEY, user ? JSON.stringify(user) : null);
  writeStorage(otherStore(), USER_KEY, null);
}

export function clearSession() {
  writeStorage(window.localStorage, TOKEN_KEY, null);
  writeStorage(window.sessionStorage, TOKEN_KEY, null);
  writeStorage(window.localStorage, USER_KEY, null);
  writeStorage(window.sessionStorage, USER_KEY, null);
  writeStorage(window.localStorage, REMEMBER_KEY, null);
}

export function subscribeSessionLoss(listener: SessionListener) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function markSessionExpired() {
  writeStorage(window.sessionStorage, SESSION_FLAG, "1");
  for (const listener of sessionListeners) {
    listener();
  }
}

export function consumeSessionExpiredMessage() {
  const flagged = readStorage(window.sessionStorage, SESSION_FLAG) === "1";
  if (!flagged) {
    return "";
  }
  writeStorage(window.sessionStorage, SESSION_FLAG, null);
  return SESSION_ENDED_MESSAGE;
}

export function getAccessTokenExpiry(token = getAccessToken()) {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized)) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAuthExempt(url?: string) {
  return Boolean(url && AUTH_EXEMPT.test(url));
}

function isUnauthorized(error: AxiosError) {
  return error.response?.status === 401;
}

export async function refreshAccessToken(options?: { silent?: boolean }) {
  if (!refreshInFlight) {
    const hadToken = Boolean(getAccessToken());
    refreshInFlight = api
      .post("/auth/refresh", undefined, { skipAuthRefresh: true })
      .then(({ data }) => {
        const token = data?.data?.accessToken as string | undefined;
        if (!token) {
          throw new Error("missing access token");
        }
        syncRememberFromLocation();
        setAccessToken(token);
        const user = data?.data?.user as PublicUser | undefined;
        if (user) {
          setStoredUser(user);
        }
        return token;
      })
      .catch((error: unknown) => {
        const unauthorized = axios.isAxiosError(error) && error.response?.status === 401;
        if (!unauthorized) {
          return null;
        }
        clearSession();
        if (!options?.silent && hadToken) {
          markSessionExpired();
        }
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.request.use((config: RetryConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (
      !original ||
      original.skipAuthRefresh ||
      original._retry ||
      isAuthExempt(original.url) ||
      !isUnauthorized(error)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    const token = await refreshAccessToken();
    if (!token) {
      return Promise.reject(error);
    }

    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  },
);
