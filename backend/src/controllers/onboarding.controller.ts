import type { Request, Response } from "express";
import * as onboardingService from "../services/onboarding.service.js";
import { ApiError } from "../utils/api-error.js";

export async function getOnboarding(req: Request, res: Response) {
  const profile = await onboardingService.getOnboardingProfile(req.user!.id);
  return res.json({ success: true, data: { profile } });
}

export async function saveOnboarding(req: Request, res: Response) {
  const profile = await onboardingService.saveOnboarding(req.user!.id, req.body);
  return res.json({ success: true, data: { profile } });
}

export async function uploadOnboardingPhoto(req: Request, res: Response) {
  if (!req.file) {
    throw ApiError.badRequest("Debes adjuntar un archivo de imagen");
  }
  const profile = await onboardingService.uploadOnboardingPhoto(req.user!.id, req.file);
  return res.status(201).json({ success: true, data: { profile } });
}

export async function deleteOnboardingPhoto(req: Request, res: Response) {
  const profile = await onboardingService.deleteOnboardingPhoto(req.user!.id);
  return res.json({ success: true, data: { profile } });
}
