import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as journeyController from "../controllers/journey.controller.js";
import {
  createPlanSchema,
  decorationPatchSchema,
  decorationSchema,
  memorySchema,
  stickerSchema,
  themeSchema,
  updatePlanSchema,
} from "../validators/journey.validator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const journeyRouter = Router();

journeyRouter.use(authMiddleware);

journeyRouter.get("/", asyncHandler(journeyController.load));
journeyRouter.get("/catalog", asyncHandler(journeyController.catalog));

journeyRouter.post("/plans", validate(createPlanSchema), asyncHandler(journeyController.createPlan));
journeyRouter.patch("/plans/:planId", validate(updatePlanSchema), asyncHandler(journeyController.updatePlan));
journeyRouter.delete("/plans/:planId", asyncHandler(journeyController.deletePlan));

journeyRouter.put("/board", validate(themeSchema), asyncHandler(journeyController.saveTheme));
journeyRouter.post("/decorations", validate(decorationSchema), asyncHandler(journeyController.createDecoration));
journeyRouter.patch(
  "/decorations/:decorationId",
  validate(decorationPatchSchema),
  asyncHandler(journeyController.updateDecoration),
);
journeyRouter.delete("/decorations/:decorationId", asyncHandler(journeyController.deleteDecoration));

journeyRouter.post("/memories", validate(memorySchema), asyncHandler(journeyController.createMemory));
journeyRouter.patch("/memories/:memoryId", validate(memorySchema), asyncHandler(journeyController.updateMemory));
journeyRouter.delete("/memories/:memoryId", asyncHandler(journeyController.deleteMemory));
journeyRouter.post("/memories/:memoryId/photos", upload.single("image"), asyncHandler(journeyController.addPhoto));
journeyRouter.delete("/memories/:memoryId/photos/:photoId", asyncHandler(journeyController.deletePhoto));
journeyRouter.post(
  "/memories/:memoryId/stickers",
  validate(stickerSchema),
  asyncHandler(journeyController.addSticker),
);
journeyRouter.patch(
  "/memories/:memoryId/stickers/:stickerId",
  validate(stickerSchema),
  asyncHandler(journeyController.updateSticker),
);
journeyRouter.delete("/memories/:memoryId/stickers/:stickerId", asyncHandler(journeyController.deleteSticker));
