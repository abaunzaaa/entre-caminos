import { api } from "./api";
import type { AdminNotification, ApiResponse } from "../types";

export const NOTIFICATIONS_REFRESH_EVENT = "ec-notifications-refresh";

export function requestNotificationsRefresh() {
  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
}

export async function getNotifications() {
  const { data } = await api.get<ApiResponse<{ items: AdminNotification[]; unreadCount: number }>>(
    "/notifications",
  );
  return data.data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch<ApiResponse<{ notification: AdminNotification }>>(
    `/notifications/${id}/read`,
  );
  return data.data.notification;
}

export async function markAllNotificationsRead() {
  await api.patch("/notifications/read-all");
}
