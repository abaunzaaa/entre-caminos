import type { CorsOptions } from "cors";
import { env, isProduction } from "./env.js";

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const allowed = [env.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"];

    if (allowed.includes(origin) || !isProduction) {
      return callback(null, true);
    }

    return callback(new Error("Origen no permitido por CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
