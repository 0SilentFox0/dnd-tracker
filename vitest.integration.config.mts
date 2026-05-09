/**
 * Vitest config для **інтеграційних** тестів.
 *
 * Запуск: `pnpm test:integration` (потребує .env.local з реальними
 * credentials — DATABASE_URL, PUSHER_*, REDIS_URL/UPSTASH_REDIS_REST_*).
 *
 * Тести `*.integration.test.ts` виконують реальні мережеві виклики:
 *  - Prisma → Supabase Postgres (SELECT 1, без mutations)
 *  - Pusher → trigger подію на тестовий канал
 *  - Redis (Upstash REST + Redis Cloud TCP) → SET/GET/DEL з префіксом
 *
 * Без credentials — тести `it.skipIf(!hasCredentials)` пропускаються
 * замість fail.
 */

import path from "path";
import { defineConfig } from "vitest/config";

import dotenv from "dotenv";

// Завантажуємо .env.local у process.env — vitest сам не парсить .env.
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    // Реальні мережеві виклики — даємо більше часу.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Серійний запуск — щоб не перевантажувати Pusher/Upstash free tier.
    // Vitest 4: `poolOptions.forks.singleFork` → `fileParallelism: false`.
    pool: "forks",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
