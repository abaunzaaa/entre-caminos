import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";
import * as plannerService from "../services/planner.service.js";

function userId(req: Request) {
  if (!req.user?.id) {
    throw ApiError.unauthorized();
  }
  return req.user.id;
}

export async function options(_req: Request, res: Response) {
  res.json(await plannerService.plannerOptions());
}

export async function generate(req: Request, res: Response) {
  res.json(await plannerService.generateItinerary(req.body));
}

export async function save(req: Request, res: Response) {
  res.status(201).json(await plannerService.saveItinerary(userId(req), req.body));
}

export async function list(req: Request, res: Response) {
  res.json(await plannerService.listItineraries(userId(req)));
}

export async function get(req: Request, res: Response) {
  res.json(await plannerService.getItinerary(userId(req), String(req.params.id)));
}
