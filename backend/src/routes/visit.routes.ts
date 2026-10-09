import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as visitController from "../controllers/visit.controller.js";

export const visitRouter = Router();

visitRouter.use(authMiddleware);

visitRouter.get("/", asyncHandler(visitController.list));
visitRouter.get("/:experienceId", asyncHandler(visitController.status));
visitRouter.post("/:experienceId", asyncHandler(visitController.add));
visitRouter.delete("/:experienceId", asyncHandler(visitController.remove));
