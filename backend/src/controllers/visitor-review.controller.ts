import type { Request, Response } from "express";
import * as visitorReviewService from "../services/visitor-review.service.js";

export async function list(req: Request, res: Response) {
  const data = await visitorReviewService.listVisitorReviews(String(req.params.experienceId), req.user?.id);
  return res.json({ success: true, data });
}

function reviewFiles(req: Request) {
  return Array.isArray(req.files) ? req.files : [];
}

export async function create(req: Request, res: Response) {
  const data = await visitorReviewService.createVisitorReview(
    req.user!.id,
    String(req.params.experienceId),
    req.body,
    reviewFiles(req),
  );
  return res.status(201).json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const data = await visitorReviewService.updateVisitorReview(
    req.user!.id,
    String(req.params.experienceId),
    req.body,
    { files: reviewFiles(req), keepImageIds: req.body.keepImageIds },
  );
  return res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  const data = await visitorReviewService.deleteVisitorReview(req.user!.id, String(req.params.experienceId));
  return res.json({ success: true, data });
}
