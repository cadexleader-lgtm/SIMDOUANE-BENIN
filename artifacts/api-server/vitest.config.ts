import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The integration tests share one disposable database: run files one by one.
    fileParallelism: false,
  },
});
