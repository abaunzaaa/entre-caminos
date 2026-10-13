import type { Request, Response } from "express";
import * as visitService from "../services/visit.service.js";

export async function list(req: Request, res: Response) {
  const ids = await visitService.listVisitedExperienceIds(req.user!.id);
  return res.json({ success: true, data: { ids } });
}

export async function status(req: Request, res: Response) {
  const visited = await visitService.isExperienceVisited(req.user!.id, String(req.params.experienceId));
  return res.json({ success: true, data: { visited } });
}

export async function add(req: Request, res: Response) {
  const data = await visitService.addVisit(req.user!.id, String(req.params.experienceId));
  return res.status(201).json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  const data = await visitService.removeVisit(req.user!.id, String(req.params.experienceId));
  return res.json({ success: true, data });
}
