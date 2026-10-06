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
        abilities: true,
      },
    });

    expect(Array.isArray(skills)).toBe(true);

    for (const skill of skills) {
      expect(typeof skill.id).toBe("string");
      expect(typeof skill.name).toBe("string");
      expect(["object", "string"]).toContain(typeof skill.abilities);
    }
  });
  it("усі таблиці public мають увімкнений RLS", async (ctx) => {
    if (!canConnect) ctx.skip();

    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT c.relname AS tablename
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
    `;

    expect(rows.map((r) => r.tablename)).toEqual([]);
  });

  it("існують індекси для частих фільтрів", async (ctx) => {
    if (!canConnect) ctx.skip();

    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `;

    const names = rows.map((r) => r.indexname);

    expect(names).toEqual(
      expect.arrayContaining([
        "battle_scenes_campaignId_idx",
        "campaign_members_userId_idx",
        "campaigns_dmUserId_idx",
        "characters_controlledBy_idx",
        "unit_groups_campaignId_idx",
        "spell_groups_campaignId_idx",
        "artifact_sets_campaignId_idx",
        "racial_abilities_campaignId_idx",
      ]),
    );
  });
});
