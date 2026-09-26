import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./database/prisma.js";

const app = createApp();

async function bootstrap() {
  await prisma.$connect();

  if (!env.SENDGRID_API_KEY) {
    logger.warn("SendGrid sin API key: verificación y recuperación de correo no enviarán mails reales.");
  }
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.warn(
      "Cloudinary no configurado: las imágenes se guardan en backend/uploads (solo esta máquina, vía /uploads).",
    );
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Entre Caminos API lista en http://localhost:${env.PORT}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.error(`El puerto ${env.PORT} ya está en uso. Cierra el otro proceso del backend e inténtalo de nuevo.`);
      process.exit(1);
    }
    logger.error("No se pudo iniciar el servidor", { message: error.message });
    process.exit(1);
  });

  const shutdown = () => {
    server.close(async () => {
      await prisma.$disconnect().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  logger.error("No se pudo iniciar el servidor", {
    message: error instanceof Error ? error.message : "unknown",
  });
  process.exit(1);
});
