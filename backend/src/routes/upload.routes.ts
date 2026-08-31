import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { permissionMiddleware } from "../middleware/role.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { PERMISSIONS } from "../config/constants.js";
import * as uploadController from "../controllers/upload.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadRouter = Router();

uploadRouter.post(
  "/",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.EXPERIENCES_MANAGE),
  upload.single("image"),
  asyncHandler(uploadController.uploadImage),
);
