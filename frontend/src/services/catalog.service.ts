import { api } from "./api";
import type { ApiResponse, Category, DashboardStats, Experience, Permission, PublicUser, Role } from "../types";

export async function getFeaturedExperiences() {
  const { data } = await api.get<ApiResponse<{ experiences: Experience[] }>>("/experiences/featured");
  return data.data.experiences;
}

export async function getPublicExperiences() {
  const { data } = await api.get<ApiResponse<{ experiences: Experience[] }>>("/experiences");
  return data.data.experiences;
}

export async function getPublicExperience(id: string) {
  const { data } = await api.get<ApiResponse<{ experience: Experience }>>(`/experiences/${id}`);
  return data.data.experience;
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
  status?: "ACTIVE" | "INACTIVE";
}) {
  const { data } = await api.post("/admin/categories", payload);
  return data.data.category as Category;
}

export async function updateCategory(id: string, payload: Partial<Category>) {
  const { data } = await api.put(`/admin/categories/${id}`, payload);
  return data.data.category as Category;
}

export async function deleteCategory(id: string) {
  await api.delete(`/admin/categories/${id}`);
}

export async function getAdminExperiences(options?: { limit?: number }) {
  const { data } = await api.get<ApiResponse<{ experiences: Experience[] }>>("/admin/experiences", {
    params: options?.limit ? { limit: options.limit } : undefined,
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
