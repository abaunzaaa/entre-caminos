import { defineConfig } from "vitest/config";

/**
 * Configuración por defecto: solo unitarias, sin BD.
 * NO usa tests/setup.ts (ese reset borró la base compartida).
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 10000,
  },
});
