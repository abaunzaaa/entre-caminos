import { Router } from "express";
import { contactRateLimiter } from "../middleware/rate-limit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as contactController from "../controllers/contact.controller.js";
import { contactSchema } from "../validators/contact.validator.js";

export const contactRouter = Router();

contactRouter.post(
  "/",
  contactRateLimiter,
  validate(contactSchema),
  asyncHandler(contactController.create),
);
