import { Router } from "express";
import { permissionMiddleware } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { PERMISSIONS } from "../config/constants.js";
import * as experienceController from "../controllers/experience.controller.js";
import {
  experienceSchema,
  experienceStatusSchema,
  experienceUpdateSchema,
} from "../validators/experience.validator.js";

export const experienceRouter = Router();

experienceRouter.get("/", asyncHandler(experienceController.listPublic));
experienceRouter.get("/featured", asyncHandler(experienceController.featured));
experienceRouter.get("/:id", asyncHandler(experienceController.getPublic));

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
adminExperienceRouter.patch(
  "/:id/status",
  validate(experienceStatusSchema),
  asyncHandler(experienceController.changeStatus),
);
adminExperienceRouter.delete("/:id", asyncHandler(experienceController.remove));
