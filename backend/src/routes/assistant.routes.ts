import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { assistantChatSchema } from "../validators/assistant.validator.js";
import * as assistantController from "../controllers/assistant.controller.js";

export const assistantRouter = Router();

assistantRouter.use(authMiddleware);
assistantRouter.post("/chat", validate(assistantChatSchema), asyncHandler(assistantController.chat));
