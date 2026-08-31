import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    fileParallelism: false,
    sequence: { concurrent: false },
    setupFiles: ["./tests/setup.ts"],
    globalTeardown: "./tests/teardown.ts",
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
