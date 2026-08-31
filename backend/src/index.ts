import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./database/prisma.js";

const app = createApp();

async function bootstrap() {
  await prisma.$connect();
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
