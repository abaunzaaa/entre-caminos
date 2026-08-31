import type { Request, Response } from "express";
import * as adminService from "../services/admin.service.js";

export async function dashboard(_req: Request, res: Response) {
  const metrics = await adminService.getDashboardMetrics();
  return res.json({ success: true, data: metrics });
}

export async function listAdmins(_req: Request, res: Response) {
  const admins = await adminService.listAdministrators();
  return res.json({ success: true, data: { admins } });
}

export async function createAdmin(req: Request, res: Response) {
  const admin = await adminService.createAdministrator(req.user!.id, req.body);
  return res.status(201).json({ success: true, data: { admin } });
}

export async function updateAdmin(req: Request, res: Response) {
  const admin = await adminService.updateAdministrator(req.user!.id, req.params.id, req.body);
  return res.json({ success: true, data: { admin } });
}
