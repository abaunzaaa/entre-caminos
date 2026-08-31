import { Router } from "express";
import { permissionMiddleware } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { PERMISSIONS } from "../config/constants.js";
import * as categoryController from "../controllers/category.controller.js";
import { categorySchema, categoryUpdateSchema } from "../validators/category.validator.js";

export const categoryRouter = Router();

categoryRouter.get("/", asyncHandler(categoryController.listPublic));
categoryRouter.get("/:id", asyncHandler(categoryController.getById));

export const adminCategoryRouter = Router();
adminCategoryRouter.use(permissionMiddleware(PERMISSIONS.CATEGORIES_MANAGE));

adminCategoryRouter.get("/", asyncHandler(categoryController.listAdmin));
adminCategoryRouter.post("/", validate(categorySchema), asyncHandler(categoryController.create));
adminCategoryRouter.put("/:id", validate(categoryUpdateSchema), asyncHandler(categoryController.update));
adminCategoryRouter.delete("/:id", asyncHandler(categoryController.remove));
