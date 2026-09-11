import type { AuthUser } from "../models/auth-user.js";

type CacheEntry = { user: AuthUser; profile?: CachedProfile; expiresAt: number };

export type CachedProfile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: string;
  role: string;
  createdAt: Date;
  permissions: string[];
  profile?: unknown;
};

const cache = new Map<string, CacheEntry>();
const revocations = new Map<string, number>();
const TTL_MS = 30_000;

function readEntry(id: string) {
  const row = cache.get(id);
  if (!row) {
    return undefined;
  }
  if (row.expiresAt <= Date.now()) {
    cache.delete(id);
    return undefined;
  }
  return row;
}

export function getCachedAuthUser(id: string) {
  return readEntry(id)?.user;
}

export function getCachedProfile(id: string) {
  return readEntry(id)?.profile;
}

export function setCachedAuthUser(user: AuthUser, profile?: CachedProfile) {
  cache.set(user.id, { user, profile, expiresAt: Date.now() + TTL_MS });
}

export function clearAuthUserCache(userId?: string) {
  if (userId) {
    cache.delete(userId);
    return;
  }
  cache.clear();
}

export function revokeAuthUser(userId: string) {
  revocations.set(userId, Date.now());
  cache.delete(userId);
}

export function isAuthRevoked(userId: string, tokenIat?: number) {
  const revokedAt = revocations.get(userId);
  if (!revokedAt) {
    return false;
  }
  if (tokenIat == null) {
    return true;
  }
  return tokenIat * 1000 < revokedAt;
}
