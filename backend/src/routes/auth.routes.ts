import type { RequestHandler } from "express";
import { Router as createRouter } from "express";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import multer from "multer";
import * as authController from "../controllers/auth.controller.js";
import * as onboardingController from "../controllers/onboarding.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator.js";
import { onboardingSaveSchema } from "../validators/onboarding.validator.js";

export const authRouter = createRouter();

authRouter.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(authController.register),
);

authRouter.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);

authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.get("/me", authMiddleware, asyncHandler(authController.me));

const onboardingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

authRouter.get("/onboarding", authMiddleware, asyncHandler(onboardingController.getOnboarding));
authRouter.patch(
  "/onboarding",
  authMiddleware,
  validate(onboardingSaveSchema),
  asyncHandler(onboardingController.saveOnboarding),
);
authRouter.post(
  "/onboarding/photo",
  authMiddleware,
  onboardingUpload.single("image"),
  asyncHandler(onboardingController.uploadOnboardingPhoto),
);
authRouter.delete("/onboarding/photo", authMiddleware, asyncHandler(onboardingController.deleteOnboardingPhoto));

authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

authRouter.post(
  "/verify-email",
  authRateLimiter,
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

authRouter.post(
  "/resend-verification-code",
  authRateLimiter,
  validate(resendVerificationSchema),
  asyncHandler(authController.resendVerificationCode),
);

const setGoogleProvider: RequestHandler = (req, _res, next) => {
  req.params.provider = "google";
  next();
};

authRouter.get("/google", setGoogleProvider, asyncHandler(authController.oauthStart));
authRouter.get("/google/callback", setGoogleProvider, asyncHandler(authController.oauthCallback));
authRouter.post("/google/callback", setGoogleProvider, asyncHandler(authController.oauthCallback));
