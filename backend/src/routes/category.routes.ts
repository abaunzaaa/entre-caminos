import { Router } from "express";
import { permissionMiddleware, roleMiddleware } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { PERMISSIONS, ROLES } from "../config/constants.js";
import * as categoryController from "../controllers/category.controller.js";
import {
  categoryRejectSchema,
  categorySchema,
  categoryUpdateSchema,
} from "../validators/category.validator.js";

export const categoryRouter = Router();

categoryRouter.get("/", asyncHandler(categoryController.listPublic));
categoryRouter.get("/:id", asyncHandler(categoryController.getById));

export const adminCategoryRouter = Router();
adminCategoryRouter.use(permissionMiddleware(PERMISSIONS.CATEGORIES_MANAGE));

adminCategoryRouter.get("/", asyncHandler(categoryController.listAdmin));
adminCategoryRouter.post("/", validate(categorySchema), asyncHandler(categoryController.create));
adminCategoryRouter.put(
  "/:id",
  roleMiddleware([ROLES.SUPER_ADMIN]),
  validate(categoryUpdateSchema),
  asyncHandler(categoryController.update),
);
adminCategoryRouter.post(
  "/:id/approve",
  roleMiddleware([ROLES.SUPER_ADMIN]),
  asyncHandler(categoryController.approve),
);
adminCategoryRouter.post(
  "/:id/reject",
  roleMiddleware([ROLES.SUPER_ADMIN]),
  validate(categoryRejectSchema),
  asyncHandler(categoryController.reject),
);
adminCategoryRouter.delete(
  "/:id",
  roleMiddleware([ROLES.SUPER_ADMIN]),
  asyncHandler(categoryController.remove),
);
