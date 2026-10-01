import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as favoriteController from "../controllers/favorite.controller.js";
import * as collectionController from "../controllers/favorite-collection.controller.js";

export const favoriteRouter = Router();

favoriteRouter.use(authMiddleware);

favoriteRouter.get("/collections", asyncHandler(collectionController.list));
favoriteRouter.post("/collections", asyncHandler(collectionController.create));
favoriteRouter.get("/collections/:collectionId", asyncHandler(collectionController.getOne));
favoriteRouter.patch("/collections/:collectionId", asyncHandler(collectionController.rename));
favoriteRouter.delete("/collections/:collectionId", asyncHandler(collectionController.remove));
favoriteRouter.post(
  "/collections/:collectionId/experiences",
  asyncHandler(collectionController.addExperience),
);
favoriteRouter.delete(
  "/collections/:collectionId/experiences/:experienceId",
  asyncHandler(collectionController.removeExperience),
);

favoriteRouter.get("/", asyncHandler(favoriteController.list));
favoriteRouter.put(
  "/:experienceId/collections",
  asyncHandler(collectionController.setExperienceCollections),
);
favoriteRouter.get(
  "/:experienceId/collections",
  asyncHandler(collectionController.listForExperience),
);
favoriteRouter.get("/:experienceId", asyncHandler(favoriteController.status));
favoriteRouter.post("/:experienceId", asyncHandler(favoriteController.add));
favoriteRouter.delete("/:experienceId", asyncHandler(favoriteController.remove));
