import { api } from "./api";
import type {
  ApiResponse,
  Category,
  DashboardStats,
  Experience,
  FeaturedExperienceCard,
  Permission,
  PublicUser,
  Role,
} from "../types";

export type FeaturedRankingCriterion = "visits" | "favorites" | "reviews" | "rating" | "trending";

export async function getFeaturedRanking(criterion: FeaturedRankingCriterion) {
  const { data } = await api.get<ApiResponse<{ experiences: FeaturedExperienceCard[]; criterion: string }>>(
    "/admin/featured-experiences/ranking",
    { params: { criterion } },
  );
  return data.data.experiences;
}

export async function getOwnExperiencePerformance(criterion: FeaturedRankingCriterion) {
  const { data } = await api.get<ApiResponse<{ experiences: FeaturedExperienceCard[]; criterion: string }>>(
    "/admin/featured-experiences/performance",
    { params: { criterion } },
  );
  return data.data.experiences;
}

export async function getAdminFeaturedExperiences() {
  const { data } = await api.get<ApiResponse<{ experiences: FeaturedExperienceCard[] }>>(
    "/admin/featured-experiences",
  );
  return data.data.experiences;
}

export async function generateFeaturedExperiences(criterion: FeaturedRankingCriterion, limit = 10) {
  await api.post("/admin/featured-experiences/generate", { criterion, limit });
}

export async function saveEditorialFeatured(experienceIds: string[]) {
  await api.post("/admin/featured-experiences/selection", { experienceIds });
}

export async function featureExperience(
  id: string,
  payload: { featuredOrder?: number | null; featuredFrom?: string | null; featuredUntil?: string | null },
) {
  const { data } = await api.post<ApiResponse<{ experience: FeaturedExperienceCard }>>(
    `/admin/featured-experiences/${id}`,
    payload,
  );
  return data.data.experience;
}

export async function reorderFeaturedExperiences(items: Array<{ id: string; featuredOrder: number }>) {
  const { data } = await api.patch<ApiResponse<{ experiences: FeaturedExperienceCard[] }>>(
    "/admin/featured-experiences/order",
    { items },
  );
  return data.data.experiences;
}

export async function unfeatureExperience(id: string) {
  await api.delete(`/admin/featured-experiences/${id}`);
}

export async function getCoverFeaturedExperiences() {
  const { data } = await api.get<ApiResponse<{ experiences: Experience[] }>>("/catalog/featured-experiences");
  return data.data.experiences;
}

export async function getRecommendedExperiences() {
  const { data } = await api.get<ApiResponse<{ experiences: Experience[]; source: "interests" | "popular" }>>(
    "/catalog/recommended-experiences",
  );
  return data.data;
}

export async function getPublicExperiences(options?: {
  limit?: number;
  offset?: number;
  page?: number;
  q?: string;
  city?: string;
  categoryId?: string;
  price?: string;
  duration?: string;
  plan?: string;
  sort?: "newest" | "oldest";
}) {
  const params =
    options?.page != null
      ? {
          page: options.page,
          limit: options.limit ?? 8,
          q: options.q || undefined,
          city: options.city || undefined,
          categoryId: options.categoryId || undefined,
          price: options.price || undefined,
          duration: options.duration || undefined,
          plan: options.plan || undefined,
          sort: options.sort,
        }
      : options?.limit != null
        ? { limit: options.limit, offset: options.offset ?? 0 }
        : undefined;
  const { data } = await api.get<
    ApiResponse<{
      experiences: Experience[];
      total: number;
      hasMore: boolean;
      page?: number;
      limit?: number;
      pageCount?: number;
      cities?: string[];
      categories?: Array<{ id: string; name: string }>;
    }>
  >("/experiences", { params });
  const total = data.data.total ?? data.data.experiences.length;
  const limit = data.data.limit ?? options?.limit;
  return {
    experiences: data.data.experiences,
    total,
    hasMore: Boolean(data.data.hasMore),
    page: data.data.page ?? options?.page ?? 1,
    pageCount: data.data.pageCount ?? (limit ? Math.ceil(total / limit) : 1),
    cities: data.data.cities ?? [],
    categories: data.data.categories ?? [],
  };
}

export async function getPublicExperience(id: string) {
  const { data } = await api.get<ApiResponse<{ experience: Experience }>>(`/experiences/${id}`);
  return data.data.experience;
}

const viewLocks = new Set<string>();

export async function recordExperienceView(id: string) {
  if (viewLocks.has(id)) {
    return;
  }
  viewLocks.add(id);
  window.setTimeout(() => viewLocks.delete(id), 1500);
  await api.post(`/experiences/${id}/view`);
}

export async function getAdminExperience(id: string) {
  const { data } = await api.get<ApiResponse<{ experience: Experience }>>(`/admin/experiences/${id}`);
  return data.data.experience;
}

export async function getPublicCategories() {
  const { data } = await api.get<ApiResponse<{ categories: Category[] }>>("/categories");
  return data.data.categories;
}

export async function getDashboard() {
  const { data } = await api.get<ApiResponse<DashboardStats>>("/admin/dashboard");
  return data.data;
}

export async function getAdministrators(options?: { limit?: number }) {
  const { data } = await api.get<ApiResponse<{ admins?: PublicUser[]; administrators?: PublicUser[] } | PublicUser[]>>(
    "/admin/administrators",
    { params: options?.limit ? { limit: options.limit } : undefined },
  );
  const payload = data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.admins)) {
    return payload.admins;
  }
  if (Array.isArray(payload?.administrators)) {
    return payload.administrators;
  }
  return [];
}

export async function createAdministrator(payload: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "SUPER_ADMIN";
}) {
  const { data } = await api.post("/admin/administrators", payload);
  const admin = data?.data?.admin ?? data?.admin;
  if (!admin) {
    throw new Error("Respuesta inválida al crear el administrador");
  }
  return admin as PublicUser;
}

export async function updateAdministrator(
  id: string,
  payload: { name?: string; status?: PublicUser["status"]; role?: "ADMIN" | "SUPER_ADMIN" },
) {
  const { data } = await api.put(`/admin/administrators/${id}`, payload);
  return data.data.admin as PublicUser;
}

export async function deleteAdministrator(id: string) {
  await api.delete(`/admin/administrators/${id}`);
}

export async function getRoles() {
  const { data } = await api.get<ApiResponse<{ roles: Role[] }>>("/admin/roles");
  return data.data.roles;
}

export async function createRole(name: string) {
  const { data } = await api.post("/admin/roles", { name });
  return data.data.role as Role;
}

export async function assignRolePermissions(roleId: string, permissionIds: string[]) {
  const { data } = await api.put(`/admin/roles/${roleId}/permissions`, { permissionIds });
  return data.data.role as Role;
}

export async function getPermissions() {
  const { data } = await api.get<ApiResponse<{ permissions: Permission[] }>>("/admin/permissions");
  return data.data.permissions;
}

export async function createPermission(name: string) {
  const { data } = await api.post("/admin/permissions", { name });
  return data.data.permission as Permission;
}

export async function getAdminCategories(options?: { limit?: number }) {
  const { data } = await api.get<ApiResponse<{ categories: Category[] }>>("/admin/categories", {
    params: options?.limit ? { limit: options.limit } : undefined,
  });
  return data.data.categories;
}

export async function createCategory(payload: {
  name: string;
  description?: string;
  icon?: string;
}) {
  const { data } = await api.post("/admin/categories", payload);
  return data.data.category as Category;
}

export async function updateCategory(id: string, payload: Partial<Category>) {
  const { data } = await api.put(`/admin/categories/${id}`, payload);
  return data.data.category as Category;
}

export async function approveCategory(id: string) {
  const { data } = await api.post(`/admin/categories/${id}/approve`);
  return data.data.category as Category;
}

export async function rejectCategory(id: string, reason: string) {
  const { data } = await api.post(`/admin/categories/${id}/reject`, { reason });
  return data.data.category as Category;
}

export async function deleteCategory(id: string) {
  await api.delete(`/admin/categories/${id}`);
}

export async function getAdminExperiences(options?: { limit?: number; status?: Experience["status"] }) {
  const params: { limit?: number; status?: Experience["status"] } = {};
  if (options?.limit) {
    params.limit = options.limit;
  }
  if (options?.status) {
    params.status = options.status;
  }
  const { data } = await api.get<ApiResponse<{ experiences: Experience[] }>>("/admin/experiences", {
    params: Object.keys(params).length ? params : undefined,
  });
  return data.data.experiences;
}

export async function createExperience(payload: Record<string, unknown>) {
  const { data } = await api.post("/admin/experiences", payload);
  return data.data.experience as Experience;
}

export async function updateExperience(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`/admin/experiences/${id}`, payload);
  return data.data.experience as Experience;
}

export async function submitExperience(id: string) {
  const { data } = await api.post(`/admin/experiences/${id}/submit`);
  return data.data.experience as Experience;
}

export async function approveExperience(id: string) {
  const { data } = await api.post(`/admin/experiences/${id}/approve`);
  return data.data.experience as Experience;
}

export async function rejectExperience(id: string, reason: string) {
  const { data } = await api.post(`/admin/experiences/${id}/reject`, { reason });
  return data.data.experience as Experience;
}

export async function changeExperienceStatus(id: string, status: Experience["status"]) {
  const { data } = await api.patch(`/admin/experiences/${id}/status`, { status });
  return data.data.experience as Experience;
}

export async function deleteExperience(id: string) {
  await api.delete(`/admin/experiences/${id}`);
}

export async function uploadImage(file: File) {
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.post("/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data.url as string;
}
