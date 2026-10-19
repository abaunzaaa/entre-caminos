import type { Request, Response } from "express";
import * as faqService from "../services/faq.service.js";
import { parseLimitQuery } from "../utils/query.js";
import type {
  AdminFaqCreateInput,
  AdminFaqListQuery,
  AdminFaqUpdateInput,
  AnswerFaqInput,
} from "../validators/faq.validator.js";

function queryPage(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function queryText(value: unknown, max = 120) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().slice(0, max);
}

export async function listPublic(req: Request, res: Response) {
  res.set("Cache-Control", "no-store");
  const data = await faqService.listPublicFaqs({
    q: queryText(req.query.q),
    page: queryPage(req.query.page),
    limit: parseLimitQuery(req.query.limit, 20) ?? 6,
  });
  return res.json({ success: true, data });
}

export async function submit(req: Request, res: Response) {
  const faq = await faqService.submitFaq(req.user!.id, req.user!.name, req.body);
  return res.status(201).json({
    success: true,
    message: "Tu pregunta fue enviada correctamente. La revisaremos pronto.",
    data: { faq },
  });
}

export async function listAdmin(req: Request, res: Response) {
  const data = await faqService.listAdminFaqs(req.query as AdminFaqListQuery);
  return res.json({ success: true, data });
}

export async function getAdmin(req: Request, res: Response) {
  const faq = await faqService.getAdminFaq(req.params.id);
  return res.json({ success: true, data: { faq } });
}

export async function create(req: Request, res: Response) {
  const faq = await faqService.createAdminFaq(req.user!.id, req.body as AdminFaqCreateInput);
  return res.status(201).json({ success: true, data: { faq } });
}

export async function update(req: Request, res: Response) {
  const faq = await faqService.updateAdminFaq(req.user!.id, req.params.id, req.body as AdminFaqUpdateInput);
  return res.json({ success: true, data: { faq } });
}

export async function answer(req: Request, res: Response) {
  const faq = await faqService.answerFaq(req.user!.id, req.params.id, req.body as AnswerFaqInput);
  return res.json({ success: true, data: { faq } });
}

export async function publish(req: Request, res: Response) {
  const faq = await faqService.publishFaq(req.user!.id, req.params.id);
  return res.json({ success: true, data: { faq } });
}

export async function unpublish(req: Request, res: Response) {
  const faq = await faqService.unpublishFaq(req.user!.id, req.params.id);
  return res.json({ success: true, data: { faq } });
}

export async function hide(req: Request, res: Response) {
  const faq = await faqService.hideFaq(req.user!.id, req.params.id);
  return res.json({ success: true, data: { faq } });
}

export async function discard(req: Request, res: Response) {
  const faq = await faqService.discardFaq(req.user!.id, req.params.id);
  return res.json({ success: true, data: { faq } });
}

export async function remove(req: Request, res: Response) {
  await faqService.deleteFaq(req.user!.id, req.params.id);
  return res.json({ success: true, message: "La pregunta se eliminó correctamente." });
}
