import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import * as visitorReviewController from "../controllers/visitor-review.controller.js";
import { VISITOR_REVIEW_MESSAGES, visitorReviewSchema } from "../validators/visitor-review.validator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

function reviewImages(req: Request, res: Response, next: NextFunction) {
  upload.array("images", 5)(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(ApiError.badRequest(VISITOR_REVIEW_MESSAGES.photoSize));
        return;
      }
      if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
        next(ApiError.badRequest(VISITOR_REVIEW_MESSAGES.photosMax));
        return;
      }
    }
    next(error);
  });
}

export const visitorReviewRouter = Router();

visitorReviewRouter.get(
  "/:experienceId/reviews",
  optionalAuthMiddleware,
  asyncHandler(visitorReviewController.list),
);

visitorReviewRouter.post(
  "/:experienceId/reviews",
  authMiddleware,
  reviewImages,
  validate(visitorReviewSchema),
  asyncHandler(visitorReviewController.create),
);

visitorReviewRouter.patch(
  "/:experienceId/reviews/:reviewId",
  authMiddleware,
  reviewImages,
  validate(visitorReviewSchema),
  asyncHandler(visitorReviewController.update),
);

visitorReviewRouter.delete(
  "/:experienceId/reviews/:reviewId",
  authMiddleware,
  asyncHandler(visitorReviewController.remove),
);
