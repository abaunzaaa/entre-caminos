import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  assistantChatSchema,
  conversationIdParamSchema,
  createConversationSchema,
  createFolderSchema,
  folderIdParamSchema,
  updateConversationSchema,
  updateFolderSchema,
} from "../validators/assistant.validator.js";
import * as assistantController from "../controllers/assistant.controller.js";
import * as folderController from "../controllers/folder.controller.js";

export const assistantRouter = Router();

assistantRouter.use(authMiddleware);
assistantRouter.get("/folders", asyncHandler(folderController.list));
assistantRouter.post("/folders", validate(createFolderSchema), asyncHandler(folderController.create));
assistantRouter.patch(
  "/folders/:id",
  validate(folderIdParamSchema, "params"),
  validate(updateFolderSchema),
  asyncHandler(folderController.update),
);
assistantRouter.delete(
  "/folders/:id",
  validate(folderIdParamSchema, "params"),
  asyncHandler(folderController.remove),
);
assistantRouter.get("/conversations", asyncHandler(assistantController.list));
assistantRouter.post("/conversations", validate(createConversationSchema), asyncHandler(assistantController.create));
assistantRouter.get(
  "/conversations/:id",
  validate(conversationIdParamSchema, "params"),
  asyncHandler(assistantController.get),
);
assistantRouter.patch(
  "/conversations/:id",
  validate(conversationIdParamSchema, "params"),
  validate(updateConversationSchema),
  asyncHandler(assistantController.update),
);
assistantRouter.delete(
  "/conversations/:id",
  validate(conversationIdParamSchema, "params"),
  asyncHandler(assistantController.remove),
);
assistantRouter.post("/chat", validate(assistantChatSchema), asyncHandler(assistantController.chat));
