import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import * as experienceController from "../controllers/experience.controller.js";

export const catalogRouter = Router();

catalogRouter.get("/featured-experiences", asyncHandler(experienceController.featured));
