/**
 * Інтеграційний тест: підключення до Postgres через Prisma.
 * Ніяких mutations — лише SELECT, безпечно для prod БД.
 *
 * Скіп якщо DATABASE_URL відсутній або підключення не вдається
 * (наприклад, паузнутий Supabase tenant — теж рахуємо як skip,
 * а не fail, щоб локальний run не падав через стейл credentials).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { findMissing } from "./_helpers";

import { prisma } from "@/lib/db";

const missing = findMissing("DATABASE_URL");

let canConnect = missing.length === 0;

if (!canConnect) {
  console.warn(`[integration:db] skipped — missing: ${missing.join(", ")}`);
}

// Quick reachability ping. Якщо tenant паузнутий / dead — скіпаємо,
// замість того щоб падати у кожному тесті.
beforeAll(async () => {
  if (!canConnect) return;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    canConnect = false;
    console.warn(
      `[integration:db] skipped — connection failed (паузнутий tenant?):`,
      err instanceof Error ? err.message.slice(0, 200) : String(err),
    );
  }
});

afterAll(async () => {
  // disconnect навіть якщо canConnect=false (Prisma міг встигнути
  // створити idle pool до failed ping).
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
});

describe.skipIf(missing.length > 0)("DB integration (Prisma → Supabase)", () => {
  it("підключається + SELECT 1 повертає число 1", async (ctx) => {
    if (!canConnect) ctx.skip();

    const result = await prisma.$queryRaw<Array<{ ok: number }>>`
      SELECT 1::int AS ok
    `;

    expect(result).toHaveLength(1);
    expect(Number(result[0].ok)).toBe(1);
  });

  it("читає список campaigns без помилки (read-only)", async (ctx) => {
    if (!canConnect) ctx.skip();

    const count = await prisma.campaign.count();

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("читає список skills без помилки (перевірка JSON-полів)", async (ctx) => {
    if (!canConnect) ctx.skip();

    const skills = await prisma.skill.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        combatStats: true,
      },
    });

    expect(Array.isArray(skills)).toBe(true);

    for (const skill of skills) {
      expect(typeof skill.id).toBe("string");
      expect(typeof skill.name).toBe("string");
      // combatStats — Json-поле, очікуємо object/null/array
      expect(["object", "string"]).toContain(typeof skill.combatStats);
    }
  });
});
