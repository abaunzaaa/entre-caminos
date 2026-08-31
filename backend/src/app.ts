import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { corsOptions } from "./config/cors.js";
import { apiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { apiRouter } from "./routes/index.js";
import "./models/auth-user.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(process.env.NODE_ENV === "test" ? "tiny" : "dev"));
  app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
  app.get("/", (_req, res) => {
    res.type("html").send(
      `<!doctype html><html lang="es"><body style="font-family:Georgia,serif;padding:48px">
        <p>Esta es la API de Entre Caminos.</p>
        <p>Abre la aplicación en <a href="http://127.0.0.1:5173">http://127.0.0.1:5173</a></p>
      </body></html>`,
    );
  });
  app.use("/api", apiRateLimiter, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
