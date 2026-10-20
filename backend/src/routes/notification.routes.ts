import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as notificationController from "../controllers/notification.controller.js";

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);
notificationRouter.get("/", asyncHandler(notificationController.list));
notificationRouter.patch("/read-all", asyncHandler(notificationController.markAllRead));
notificationRouter.patch("/:id/read", asyncHandler(notificationController.markRead));
