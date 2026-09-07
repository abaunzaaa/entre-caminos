import { api } from "./api";
import type { AdminNotification, ApiResponse } from "../types";

export async function getNotifications() {
  const { data } = await api.get<ApiResponse<{ items: AdminNotification[]; unreadCount: number }>>(
    "/admin/notifications",
  );
  return data.data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch<ApiResponse<{ notification: AdminNotification }>>(
    `/admin/notifications/${id}/read`,
  );
  return data.data.notification;
}

export async function markAllNotificationsRead() {
  await api.patch("/admin/notifications/read-all");
}
