import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

process.env.NODE_ENV = "test";

const backendEnvPath = path.resolve(process.cwd(), ".env");
const fileEnv = fs.existsSync(backendEnvPath)
  ? dotenv.parse(fs.readFileSync(backendEnvPath))
  : {};

const testUrl = process.env.TEST_DATABASE_URL || fileEnv.TEST_DATABASE_URL;
const testDirect = process.env.TEST_DIRECT_URL || fileEnv.TEST_DIRECT_URL || testUrl;
const sharedUrl = fileEnv.DATABASE_URL;

if (!testUrl) {
  console.error(
    "Falta TEST_DATABASE_URL. Los tests no usan Docker ni la base compartida de entre-caminos-db.",
  );
  console.error("Crea un proyecto Supabase de prueba y defínelo en backend/.env.");
  process.exit(1);
}

if (sharedUrl && testUrl === sharedUrl) {
  console.error("TEST_DATABASE_URL no puede ser igual a DATABASE_URL (base compartida del equipo).");
  process.exit(1);
}

process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = testDirect;
process.env.JWT_ACCESS_SECRET = "test-access-secret-must-be-32-chars-min";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-must-be-32-chars-min";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.SEED_ADMIN_EMAIL = "angie.diaz@entrecaminos.com";
process.env.SEED_ADMIN_PASSWORD = "TestAdmin#2026";
process.env.SEED_ADMIN_NAME = "Angie Diaz";
