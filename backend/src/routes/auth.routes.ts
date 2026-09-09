import type { RequestHandler } from "express";
import { Router as createRouter } from "express";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as authController from "../controllers/auth.controller.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator.js";

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

(["google", "apple", "microsoft"] as const).forEach((provider) => {
  const setProvider: RequestHandler = (req, _res, next) => {
    req.params.provider = provider;
    next();
  };

  authRouter.get(`/${provider}`, authRateLimiter, setProvider, asyncHandler(authController.oauthStart));
  authRouter.get(`/${provider}/callback`, authRateLimiter, setProvider, asyncHandler(authController.oauthCallback));
  authRouter.post(`/${provider}/callback`, authRateLimiter, setProvider, asyncHandler(authController.oauthCallback));
});
