import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as favoriteController from "../controllers/favorite.controller.js";

export const favoriteRouter = Router();

favoriteRouter.use(authMiddleware);
favoriteRouter.get("/", asyncHandler(favoriteController.list));
favoriteRouter.get("/:experienceId", asyncHandler(favoriteController.status));
favoriteRouter.post("/:experienceId", asyncHandler(favoriteController.add));
favoriteRouter.delete("/:experienceId", asyncHandler(favoriteController.remove));
