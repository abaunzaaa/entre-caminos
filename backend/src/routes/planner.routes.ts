import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as plannerController from "../controllers/planner.controller.js";
import { generatePlannerSchema, plannerIdParamSchema, savePlannerSchema } from "../validators/planner.validator.js";

export const plannerRouter = Router();

plannerRouter.use(authMiddleware);
plannerRouter.get("/options", asyncHandler(plannerController.options));
plannerRouter.post("/generate", validate(generatePlannerSchema), asyncHandler(plannerController.generate));
plannerRouter.get("/itineraries", asyncHandler(plannerController.list));
plannerRouter.post("/itineraries", validate(savePlannerSchema), asyncHandler(plannerController.save));
plannerRouter.get(
  "/itineraries/:id",
  validate(plannerIdParamSchema, "params"),
  asyncHandler(plannerController.get),
);
