import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { faqSubmitRateLimiter } from "../middleware/rate-limit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as faqController from "../controllers/faq.controller.js";
import {
  adminFaqCreateSchema,
  adminFaqListSchema,
  adminFaqUpdateSchema,
  answerFaqSchema,
  faqIdSchema,
  submitFaqSchema,
} from "../validators/faq.validator.js";

export const faqRouter = Router();

faqRouter.get("/", asyncHandler(faqController.listPublic));
faqRouter.post(
  "/",
  faqSubmitRateLimiter,
  authMiddleware,
  validate(submitFaqSchema),
  asyncHandler(faqController.submit),
);

export const adminFaqRouter = Router();

adminFaqRouter.get("/", validate(adminFaqListSchema, "query"), asyncHandler(faqController.listAdmin));
adminFaqRouter.post("/", validate(adminFaqCreateSchema), asyncHandler(faqController.create));
adminFaqRouter.get("/:id", validate(faqIdSchema, "params"), asyncHandler(faqController.getAdmin));
adminFaqRouter.put(
  "/:id",
  validate(faqIdSchema, "params"),
  validate(adminFaqUpdateSchema),
  asyncHandler(faqController.update),
);
adminFaqRouter.post(
  "/:id/answer",
  validate(faqIdSchema, "params"),
  validate(answerFaqSchema),
  asyncHandler(faqController.answer),
);
adminFaqRouter.post("/:id/publish", validate(faqIdSchema, "params"), asyncHandler(faqController.publish));
adminFaqRouter.post("/:id/unpublish", validate(faqIdSchema, "params"), asyncHandler(faqController.unpublish));
adminFaqRouter.post("/:id/hide", validate(faqIdSchema, "params"), asyncHandler(faqController.hide));
adminFaqRouter.post("/:id/discard", validate(faqIdSchema, "params"), asyncHandler(faqController.discard));
adminFaqRouter.delete("/:id", validate(faqIdSchema, "params"), asyncHandler(faqController.remove));
