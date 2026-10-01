import type { Request, Response } from "express";
import * as favoriteService from "../services/favorite.service.js";
import { parseLimitQuery } from "../utils/query.js";

export async function list(req: Request, res: Response) {
  const take = parseLimitQuery(req.query.limit, 100);
  const experiences = await favoriteService.listFavoriteExperiences(req.user!.id, { take });
  return res.json({ success: true, data: { experiences } });
}

export async function status(req: Request, res: Response) {
  const favorited = await favoriteService.isExperienceFavorited(req.user!.id, req.params.experienceId);
  return res.json({ success: true, data: { favorited } });
}

export async function add(req: Request, res: Response) {
  const data = await favoriteService.addFavorite(req.user!.id, req.params.experienceId);
  return res.status(201).json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  const data = await favoriteService.removeFavorite(req.user!.id, req.params.experienceId);
  return res.json({ success: true, data });
}
