import type { AuthUser } from "../models/auth-user.js";
import { PERMISSIONS, ROLES } from "../config/constants.js";

export function canReviewExperiences(user: AuthUser) {
  return user.role === ROLES.SUPER_ADMIN || user.permissions.includes(PERMISSIONS.EXPERIENCES_REVIEW);
}
