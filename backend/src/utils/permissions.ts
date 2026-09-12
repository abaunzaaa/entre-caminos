import type { AuthUser } from "../models/auth-user.js";
import { PERMISSIONS, ROLES } from "../config/constants.js";

export function canReviewExperiences(user: AuthUser) {
  return user.role === ROLES.SUPER_ADMIN || user.permissions.includes(PERMISSIONS.EXPERIENCES_REVIEW);
}

export function canManageApprovedCategories(user: AuthUser) {
  return user.role === ROLES.SUPER_ADMIN || user.permissions.includes(PERMISSIONS.CATEGORIES_REVIEW);
}

export function isSuperAdmin(user: AuthUser) {
  return user.role === ROLES.SUPER_ADMIN;
}

/** Edit/delete approved categories or published experiences — SUPER_ADMIN only. */
export function canMutateApprovedCatalog(user: AuthUser) {
  return isSuperAdmin(user);
}

export function publishesExperiencesDirectly(user: AuthUser) {
  return isSuperAdmin(user);
}
