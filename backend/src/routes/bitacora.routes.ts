import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { saveBitacoraSchema } from "../validators/bitacora.validator.js";
import * as bitacoraController from "../controllers/bitacora.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const bitacoraRouter = Router();

bitacoraRouter.use(authMiddleware);

bitacoraRouter.get("/", asyncHandler(bitacoraController.load));
bitacoraRouter.put("/", validate(saveBitacoraSchema), asyncHandler(bitacoraController.save));
bitacoraRouter.post("/assets", upload.single("image"), asyncHandler(bitacoraController.addAsset));
bitacoraRouter.delete("/assets/:assetId", asyncHandler(bitacoraController.deleteAsset));
