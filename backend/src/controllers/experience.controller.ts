import type { ExperienceStatus } from "@prisma/client";
import type { Request, Response } from "express";
import * as experienceService from "../services/experience.service.js";

export async function listPublic(_req: Request, res: Response) {
  const experiences = await experienceService.listPublicExperiences();
  return res.json({ success: true, data: { experiences } });
}

export async function featured(_req: Request, res: Response) {
  const experiences = await experienceService.listFeaturedExperiences();
  return res.json({ success: true, data: { experiences } });
}

export async function getPublic(req: Request, res: Response) {
  const experience = await experienceService.getExperience(req.params.id, { publishedOnly: true });
  return res.json({ success: true, data: { experience } });
}

export async function listAdmin(req: Request, res: Response) {
  const status = req.query.status as ExperienceStatus | undefined;
  const categoryId = req.query.categoryId as string | undefined;
  const experiences = await experienceService.listAdminExperiences({ status, categoryId });
  return res.json({ success: true, data: { experiences } });
}

export async function getAdmin(req: Request, res: Response) {
  const experience = await experienceService.getExperience(req.params.id);
  return res.json({ success: true, data: { experience } });
}

export async function create(req: Request, res: Response) {
  const experience = await experienceService.createExperience(req.user!.id, req.body);
  return res.status(201).json({ success: true, data: { experience } });
}

export async function update(req: Request, res: Response) {
  const experience = await experienceService.updateExperience(req.user!.id, req.params.id, req.body);
  return res.json({ success: true, data: { experience } });
}

export async function changeStatus(req: Request, res: Response) {
  const experience = await experienceService.changeExperienceStatus(
    req.user!.id,
    req.params.id,
    req.body.status,
  );
  return res.json({ success: true, data: { experience } });
}

export async function remove(req: Request, res: Response) {
  await experienceService.deleteExperience(req.user!.id, req.params.id);
  return res.json({ success: true, message: "Experiencia eliminada" });
}
