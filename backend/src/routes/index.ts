import { Router } from "express";
import { health } from "../controllers/health.controller.js";
import { authRouter } from "./auth.routes.js";
import { adminRouter } from "./admin.routes.js";
import { categoryRouter } from "./category.routes.js";
import { contactRouter } from "./contact.routes.js";
import { catalogRouter } from "./catalog.routes.js";
import { experienceRouter } from "./experience.routes.js";
import { uploadRouter } from "./upload.routes.js";
import { assistantRouter } from "./assistant.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", health);
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/experiences", experienceRouter);
apiRouter.use("/uploads", uploadRouter);
apiRouter.use("/assistant", assistantRouter);
apiRouter.use(assistantRouter);
