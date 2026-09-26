import { Router } from "express";
import { optionalAuthMiddleware } from "../middleware/auth.middleware.js";
import { permissionMiddleware } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { PERMISSIONS } from "../config/constants.js";
import * as featuredController from "../controllers/featured-experience.controller.js";
import * as experienceController from "../controllers/experience.controller.js";
import {
  experienceRejectSchema,
  experienceSchema,
  experienceStatusSchema,
  experienceUpdateSchema,
} from "../validators/experience.validator.js";

export const experienceRouter = Router();

experienceRouter.get("/", asyncHandler(experienceController.listPublic));
experienceRouter.get("/featured", asyncHandler(experienceController.featured));
experienceRouter.get(
  "/recommendations",
  optionalAuthMiddleware,
  asyncHandler(featuredController.recommendations),
);
experienceRouter.get("/:id", asyncHandler(experienceController.getPublic));
experienceRouter.post("/:id/view", asyncHandler(experienceController.recordView));

export const adminExperienceRouter = Router();
adminExperienceRouter.use(permissionMiddleware(PERMISSIONS.EXPERIENCES_MANAGE));

adminExperienceRouter.get("/", asyncHandler(experienceController.listAdmin));
adminExperienceRouter.get("/:id", asyncHandler(experienceController.getAdmin));
adminExperienceRouter.post("/", validate(experienceSchema), asyncHandler(experienceController.create));
adminExperienceRouter.put(
  "/:id",
  validate(experienceUpdateSchema),
  asyncHandler(experienceController.update),
);
adminExperienceRouter.post("/:id/submit", asyncHandler(experienceController.submit));
adminExperienceRouter.post("/:id/approve", asyncHandler(experienceController.approve));
adminExperienceRouter.post(
  "/:id/reject",
  validate(experienceRejectSchema),
  asyncHandler(experienceController.reject),
);
adminExperienceRouter.patch(
  "/:id/status",
  validate(experienceStatusSchema),
  asyncHandler(experienceController.changeStatus),
);
adminExperienceRouter.delete("/:id", asyncHandler(experienceController.remove));
