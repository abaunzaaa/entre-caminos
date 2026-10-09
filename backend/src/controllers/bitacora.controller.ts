import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";
import * as bitacoraService from "../services/bitacora.service.js";

function userId(req: Request) {
  return req.user!.id;
}

export async function load(req: Request, res: Response) {
  const data = await bitacoraService.loadBitacora(userId(req));
  return res.json({ success: true, data });
}

export async function save(req: Request, res: Response) {
  const data = await bitacoraService.saveBitacora(userId(req), req.body.pages);
  return res.json({ success: true, data });
}

export async function addAsset(req: Request, res: Response) {
  if (!req.file) {
    throw ApiError.badRequest("Elige una imagen JPG, PNG o WebP.");
  }
  const asset = await bitacoraService.addBitacoraAsset(userId(req), req.file);
  return res.status(201).json({ success: true, data: { asset } });
}

export async function deleteAsset(req: Request, res: Response) {
  await bitacoraService.deleteBitacoraAsset(userId(req), req.params.assetId);
  return res.json({ success: true, data: { removed: true } });
}
