import "@testing-library/jest-dom/vitest";

// lib/db створює PrismaClient під час імпорту; без URL падають навіть тести, що не ходять у БД
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:1/test";
