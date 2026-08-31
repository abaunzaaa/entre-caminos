import type { Request, Response } from "express";
import * as roleService from "../services/role.service.js";

export async function listRoles(_req: Request, res: Response) {
  const roles = await roleService.listRoles();
  return res.json({ success: true, data: { roles } });
}

export async function createRole(req: Request, res: Response) {
  const role = await roleService.createRole(req.user!.id, req.body.name);
  return res.status(201).json({ success: true, data: { role } });
}

export async function assignPermissions(req: Request, res: Response) {
  const role = await roleService.assignPermissions(
    req.user!.id,
    req.params.id,
    req.body.permissionIds,
  );
  return res.json({ success: true, data: { role } });
}

export async function listPermissions(_req: Request, res: Response) {
  const permissions = await roleService.listPermissions();
  return res.json({ success: true, data: { permissions } });
}

export async function createPermission(req: Request, res: Response) {
  const permission = await roleService.createPermission(req.user!.id, req.body.name);
  return res.status(201).json({ success: true, data: { permission } });
}
