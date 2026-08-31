import type { Request, Response } from "express";
import { persistExperienceImage } from "../services/upload.service.js";
import { ApiError } from "../utils/api-error.js";

export async function uploadImage(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    throw ApiError.badRequest("Debes adjuntar un archivo de imagen");
  }

  const url = await persistExperienceImage(file);
  return res.status(201).json({ success: true, data: { url } });
}
