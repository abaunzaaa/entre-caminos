export const EXPERIENCES_REVIEW = "experiences.review";
export const CATEGORIES_REVIEW = "categories.review";
export const CATEGORIES_CHANGED_EVENT = "ec-categories-changed";

export function notifyCategoriesChanged() {
  window.dispatchEvent(new Event(CATEGORIES_CHANGED_EVENT));
}

export function canReviewExperiences(hasPermission: (permission: string) => boolean) {
  return hasPermission(EXPERIENCES_REVIEW);
}

export function canManageApprovedCategories(hasPermission: (permission: string) => boolean) {
  return hasPermission(CATEGORIES_REVIEW);
}

/** Edit/delete approved categories or published experiences — SUPER_ADMIN only. */
export function canMutateApprovedCatalog(role: string | null | undefined) {
  return role === "SUPER_ADMIN";
}

export function canEditExperience(
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED" | "REJECTED",
  hasPermission: (permission: string) => boolean,
  role?: string | null,
) {
  if (status === "PUBLISHED" || status === "ARCHIVED") {
    return canMutateApprovedCatalog(role);
  }
  return canReviewExperiences(hasPermission) || status === "PENDING" || status === "REJECTED" || status === "DRAFT";
}

export function canDeleteExperience(
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED" | "REJECTED",
  hasPermission: (permission: string) => boolean,
  role?: string | null,
) {
  if (status === "PUBLISHED") {
    return canMutateApprovedCatalog(role);
  }
  return canReviewExperiences(hasPermission) || status !== "PUBLISHED";
}
