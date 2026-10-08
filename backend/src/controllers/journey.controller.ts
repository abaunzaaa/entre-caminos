import type { Request, Response } from "express";
import * as journeyService from "../services/journey.service.js";
import { ApiError } from "../utils/api-error.js";

function userId(req: Request) {
  return req.user!.id;
}

export async function load(req: Request, res: Response) {
  const data = await journeyService.loadJourney(userId(req));
  return res.json({ success: true, data });
}

export async function catalog(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const experiences = await journeyService.searchJourneyCatalog(q);
  return res.json({ success: true, data: { experiences } });
}

export async function createPlan(req: Request, res: Response) {
  const plan = await journeyService.createPlan(userId(req), req.body.experienceId, req.body.plannedAt);
  return res.status(201).json({ success: true, data: { plan } });
}

export async function updatePlan(req: Request, res: Response) {
  const plan = await journeyService.updatePlan(userId(req), req.params.planId, req.body.plannedAt);
  return res.json({ success: true, data: { plan } });
}

export async function deletePlan(req: Request, res: Response) {
  await journeyService.deletePlan(userId(req), req.params.planId);
  return res.json({ success: true, data: { removed: true } });
}

export async function saveTheme(req: Request, res: Response) {
  const board = await journeyService.saveTheme(userId(req), req.body.theme);
  return res.json({ success: true, data: { board } });
}

export async function createDecoration(req: Request, res: Response) {
  const decoration = await journeyService.createDecoration(userId(req), req.body);
  return res.status(201).json({ success: true, data: { decoration } });
}

export async function updateDecoration(req: Request, res: Response) {
  const decoration = await journeyService.updateDecoration(userId(req), req.params.decorationId, req.body);
  return res.json({ success: true, data: { decoration } });
}

export async function deleteDecoration(req: Request, res: Response) {
  await journeyService.deleteDecoration(userId(req), req.params.decorationId);
  return res.json({ success: true, data: { removed: true } });
}

export async function createMemory(req: Request, res: Response) {
  const memory = await journeyService.createMemory(userId(req), req.body);
  return res.status(201).json({ success: true, data: { memory } });
}

export async function updateMemory(req: Request, res: Response) {
  const memory = await journeyService.updateMemory(userId(req), req.params.memoryId, req.body);
  return res.json({ success: true, data: { memory } });
}

export async function deleteMemory(req: Request, res: Response) {
  await journeyService.deleteMemory(userId(req), req.params.memoryId);
  return res.json({ success: true, data: { removed: true } });
}

export async function addPhoto(req: Request, res: Response) {
  if (!req.file) {
    throw ApiError.badRequest("Elige una fotografía JPG, PNG o WebP de hasta 5 MB.");
  }
  const photo = await journeyService.addMemoryPhoto(userId(req), req.params.memoryId, req.file);
  return res.status(201).json({ success: true, data: { photo } });
}

export async function deletePhoto(req: Request, res: Response) {
  await journeyService.deleteMemoryPhoto(userId(req), req.params.memoryId, req.params.photoId);
  return res.json({ success: true, data: { removed: true } });
}

export async function addSticker(req: Request, res: Response) {
  const sticker = await journeyService.addMemorySticker(userId(req), req.params.memoryId, req.body);
  return res.status(201).json({ success: true, data: { sticker } });
}

export async function updateSticker(req: Request, res: Response) {
  const sticker = await journeyService.updateMemorySticker(
    userId(req),
    req.params.memoryId,
    req.params.stickerId,
    req.body,
  );
  return res.json({ success: true, data: { sticker } });
}

export async function deleteSticker(req: Request, res: Response) {
  await journeyService.deleteMemorySticker(userId(req), req.params.memoryId, req.params.stickerId);
  return res.json({ success: true, data: { removed: true } });
}
