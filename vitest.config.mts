import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest-setup.ts"],
    // Integration тести виключаються з default-запуску (pnpm test, vitest).
    // Вони потребують .env.local credentials і запускаються через
    // окремий config: `pnpm test:integration` (vitest.integration.config.mts).
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      ".claude/**",
      "**/*.integration.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/**/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // Next aliases this itself; vitest needs the same no-op marker module
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
  },
});
