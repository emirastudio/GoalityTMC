import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/lib/**/__tests__/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      include: ["src/lib/scheduling/**/*.ts"],
      exclude: ["src/lib/scheduling/__tests__/**"],
    },
  },
});
