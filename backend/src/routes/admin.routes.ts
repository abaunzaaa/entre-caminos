import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { permissionMiddleware, roleMiddleware } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { PERMISSIONS, ROLES } from "../config/constants.js";
import * as adminController from "../controllers/admin.controller.js";
import * as roleController from "../controllers/role.controller.js";
import { adminCategoryRouter } from "./category.routes.js";
import { adminExperienceRouter } from "./experience.routes.js";
import {
  assignPermissionsSchema,
  createAdminSchema,
  createPermissionSchema,
  createRoleSchema,
  updateAdminSchema,
} from "../validators/admin.validator.js";

export const adminRouter = Router();

adminRouter.use(authMiddleware);
adminRouter.use(roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ADMIN]));

adminRouter.get(
  "/dashboard",
  permissionMiddleware(PERMISSIONS.DASHBOARD_VIEW),
  asyncHandler(adminController.dashboard),
);

adminRouter.get(
  "/administrators",
  permissionMiddleware(PERMISSIONS.ADMINS_MANAGE),
  asyncHandler(adminController.listAdmins),
);

adminRouter.post(
  "/administrators",
  permissionMiddleware(PERMISSIONS.ADMINS_MANAGE),
  validate(createAdminSchema),
  asyncHandler(adminController.createAdmin),
);

adminRouter.put(
  "/administrators/:id",
  permissionMiddleware(PERMISSIONS.ADMINS_MANAGE),
  validate(updateAdminSchema),
  asyncHandler(adminController.updateAdmin),
);

adminRouter.get(
  "/roles",
  permissionMiddleware(PERMISSIONS.ROLES_MANAGE),
  asyncHandler(roleController.listRoles),
);

adminRouter.post(
  "/roles",
  permissionMiddleware(PERMISSIONS.ROLES_MANAGE),
  validate(createRoleSchema),
  asyncHandler(roleController.createRole),
);

adminRouter.put(
  "/roles/:id/permissions",
  permissionMiddleware(PERMISSIONS.ROLES_MANAGE),
  validate(assignPermissionsSchema),
  asyncHandler(roleController.assignPermissions),
);

adminRouter.get(
  "/permissions",
  permissionMiddleware(PERMISSIONS.PERMISSIONS_MANAGE),
  asyncHandler(roleController.listPermissions),
);

adminRouter.post(
  "/permissions",
  permissionMiddleware(PERMISSIONS.PERMISSIONS_MANAGE),
  validate(createPermissionSchema),
  asyncHandler(roleController.createPermission),
);

adminRouter.use("/categories", adminCategoryRouter);
adminRouter.use("/experiences", adminExperienceRouter);
