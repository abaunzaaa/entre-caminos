import type { Request, Response } from "express";
import * as organizationProfileService from "../services/organization-profile.service.js";

export async function getOwn(req: Request, res: Response) {
  const profile = await organizationProfileService.getOwnOrganizationProfile(req.user!);
  return res.json({ success: true, data: { profile } });
}

export async function upsertOwn(req: Request, res: Response) {
  if (req.user!.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: { message: "Solo las cuentas ADMIN gestionan su propio perfil de organización" },
    });
  }
  const profile = await organizationProfileService.upsertOrganizationProfile(
    req.user!,
    req.user!.id,
    req.body,
  );
  return res.json({ success: true, data: { profile } });
}

export async function getByUserId(req: Request, res: Response) {
  const profile = await organizationProfileService.getOrganizationProfileForUser(
    req.user!,
    req.params.userId,
  );
  return res.json({ success: true, data: { profile } });
}

export async function upsertByUserId(req: Request, res: Response) {
  const profile = await organizationProfileService.upsertOrganizationProfile(
    req.user!,
    req.params.userId,
    req.body,
  );
  return res.json({ success: true, data: { profile } });
}
