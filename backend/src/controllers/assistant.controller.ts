import type { Request, Response } from "express";
import * as conversationService from "../services/conversation.service.js";

export async function chat(req: Request, res: Response) {
  const payload = await conversationService.chatInConversation({
    userId: req.user!.id,
    message: req.body.message,
    conversationId: req.body.conversationId,
    regenerate: req.body.regenerate,
    history: req.body.history ?? [],
    experienceId: req.body.experienceId ?? req.body.context?.experience?.id,
    context: req.body.context,
    location: req.body.location,
  });

  return res.json({
    success: true,
    data: payload,
  });
}

export async function list(req: Request, res: Response) {
  const conversations = await conversationService.listConversations(req.user!.id);
  return res.json({ success: true, data: { conversations } });
}

export async function get(req: Request, res: Response) {
  const conversation = await conversationService.getConversation(req.user!.id, req.params.id);
  return res.json({ success: true, data: { conversation } });
}

export async function create(req: Request, res: Response) {
  const conversation = await conversationService.createConversation(req.user!.id, req.body);
  return res.status(201).json({ success: true, data: { conversation } });
}

export async function update(req: Request, res: Response) {
  const conversation = await conversationService.updateConversation(req.user!.id, req.params.id, req.body);
  return res.json({ success: true, data: { conversation } });
}

export async function remove(req: Request, res: Response) {
  await conversationService.deleteConversation(req.user!.id, req.params.id);
  return res.json({ success: true });
}
