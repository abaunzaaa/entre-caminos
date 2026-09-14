import { defineConfig } from "vitest/config";

/** Suite local sin DB ni TEST_DATABASE_URL. */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 10000,
  },
});
