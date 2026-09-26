import { Router } from "express";
import { optionalAuthMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as experienceController from "../controllers/experience.controller.js";
import * as featuredController from "../controllers/featured-experience.controller.js";

export const catalogRouter = Router();

catalogRouter.get("/featured-experiences", asyncHandler(experienceController.featured));
catalogRouter.get(
  "/recommended-experiences",
  optionalAuthMiddleware,
  asyncHandler(featuredController.recommendations),
);
