import type { Request, Response } from "express";
import type { FeaturedRankingCriterion } from "../config/featured-score.js";
import * as featuredService from "../services/featured-experience.service.js";

export async function ranking(req: Request, res: Response) {
  const criterion = req.query.criterion as FeaturedRankingCriterion;
  const experiences = await featuredService.listFeaturedRanking(criterion);
  return res.json({ success: true, data: { experiences, criterion: req.query.criterion } });
}

export async function ownPerformance(req: Request, res: Response) {
  const criterion = req.query.criterion as FeaturedRankingCriterion;
  const experiences = await featuredService.listOwnExperiencePerformance(req.user!, criterion);
  return res.json({ success: true, data: { experiences, criterion } });
}

export async function list(_req: Request, res: Response) {
  const experiences = await featuredService.listAdminFeaturedExperiences();
  return res.json({ success: true, data: { experiences } });
}

export async function generate(req: Request, res: Response) {
  await featuredService.generateFeaturedFromRanking(
    req.user!,
    req.body.criterion,
    req.body.limit ?? 5,
  );
  return res.status(201).json({
    success: true,
    message: "Las experiencias han sido destacadas exitosamente",
  });
}

export async function saveSelection(req: Request, res: Response) {
  await featuredService.saveEditorialFeatured(req.user!, req.body.experienceIds);
  return res.status(200).json({
    success: true,
    message: "Las experiencias han sido destacadas exitosamente",
  });
}

export async function feature(req: Request, res: Response) {
  const experience = await featuredService.featureExperience(req.user!, req.params.id, req.body);
  return res.status(201).json({
    success: true,
    message: "Experiencia destacada",
    data: { experience },
  });
}

export async function reorder(req: Request, res: Response) {
  const experiences = await featuredService.updateFeaturedOrder(req.user!, req.body.items);
  return res.json({ success: true, data: { experiences } });
}

export async function unfeature(req: Request, res: Response) {
  await featuredService.unfeatureExperience(req.user!, req.params.id);
  return res.json({ success: true, message: "Experiencia retirada de destacadas" });
}

export async function recommendations(req: Request, res: Response) {
  const result = await featuredService.listRecommendedExperiences(req.user?.id);
  return res.json({ success: true, data: result });
}
