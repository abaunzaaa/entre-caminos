import type { Request, Response } from "express";
import { chatWithGuide } from "../services/assistant.service.js";

export async function chat(req: Request, res: Response) {
  const payload = await chatWithGuide({
    userId: req.user!.id,
    message: req.body.message,
    history: req.body.history ?? [],
    experienceId: req.body.experienceId,
    location: req.body.location,
  });

  return res.json({
    success: true,
    data: payload,
  });
}
