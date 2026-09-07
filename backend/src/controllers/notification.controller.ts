import type { Request, Response } from "express";
import * as notificationService from "../services/notification.service.js";
import { ApiError } from "../utils/api-error.js";

export async function list(req: Request, res: Response) {
  const data = await notificationService.listNotifications(req.user!.id);
  return res.json({ success: true, data });
}

export async function markRead(req: Request, res: Response) {
  const notification = await notificationService.markNotificationRead(req.user!.id, req.params.id);
  if (!notification) {
    throw ApiError.notFound("Notificación no encontrada");
  }
  return res.json({ success: true, data: { notification } });
}

export async function markAllRead(req: Request, res: Response) {
  await notificationService.markAllNotificationsRead(req.user!.id);
  return res.json({ success: true, message: "Notificaciones marcadas como leídas" });
}
