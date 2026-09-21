import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // The concurrency test relies on real overlapping DB transactions;
    // running test files in one process avoids pool/connection surprises.
    fileParallelism: false,
  },
});
