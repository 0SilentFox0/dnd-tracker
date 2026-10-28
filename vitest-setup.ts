import { vi } from "vitest";

// ~500 of the 700 files run in node and never touch DOM matchers; loading jest-dom there costs ~60 s of setup per run
if (typeof document !== "undefined") await import("@testing-library/jest-dom/vitest");

// next/font only works inside the Next compiler; components that import components/hud/fonts need a stub
vi.mock("next/font/google", () => ({
  Alegreya: () => ({ variable: "" }),
  Alegreya_SC: () => ({ variable: "" }),
  Alegreya_Sans: () => ({ variable: "" }),
  EB_Garamond: () => ({ variable: "" }),
}));

// lib/db створює PrismaClient під час імпорту; без URL падають навіть тести, що не ходять у БД
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:1/test";
