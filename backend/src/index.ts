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

  app.listen(env.PORT, () => {
    logger.info(`Entre Caminos API lista en http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error("No se pudo iniciar el servidor", {
    message: error instanceof Error ? error.message : "unknown",
  });
  process.exit(1);
});
