import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/lib/scheduling/__tests__/**/*.test.ts"],
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
