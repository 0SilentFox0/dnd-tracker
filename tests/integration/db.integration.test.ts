/**
 * Інтеграційний тест: підключення до Postgres через Prisma.
 * Ніяких mutations — лише SELECT, безпечно для prod БД.
 *
 * Скіп якщо DATABASE_URL відсутній.
 */

import { afterAll, describe, expect, it } from "vitest";

import { findMissing } from "./_helpers";

import { prisma } from "@/lib/db";

const missing = findMissing("DATABASE_URL");

const enabled = missing.length === 0;

if (!enabled) {
  console.warn(`[integration:db] skipped — missing: ${missing.join(", ")}`);
}

afterAll(async () => {
  if (enabled) {
    await prisma.$disconnect();
  }
});

describe.skipIf(!enabled)("DB integration (Prisma → Supabase)", () => {
  it("підключається + SELECT 1 повертає число 1", async () => {
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`
      SELECT 1::int AS ok
    `;

    expect(result).toHaveLength(1);
    expect(Number(result[0].ok)).toBe(1);
  });

  it("читає список campaigns без помилки (read-only)", async () => {
    const count = await prisma.campaign.count();

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("читає список skills без помилки (перевірка JSON-полів)", async () => {
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
