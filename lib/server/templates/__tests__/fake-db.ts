import { Prisma } from "@prisma/client";

import { BUNDLE_TABLES, type TemplateDb } from "../bundle";

type Row = Record<string, unknown>;

export function createFakeDb(campaign: Row = { maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, friendlyFire: false, rules: {} }) {
  const dbNullToNull = (r: Row): Row => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v === Prisma.DbNull ? null : v]));

  const store = new Map<string, Row[]>(BUNDLE_TABLES.map((t) => [t.delegate, []]));

  const db: Record<string, unknown> = {
    campaign: { findUnique: async () => campaign },
  };

  for (const t of BUNDLE_TABLES) {
    db[t.delegate] = {
      createMany: async ({ data }: { data: Row[] }) => {
        store.get(t.delegate)!.push(...data.map(dbNullToNull));
      },
      findMany: async ({ where }: { where: { campaignId?: string; id?: { in: string[] } } }) => {
        const rows = store.get(t.delegate)!;

        if (where.id) return rows.filter((r) => where.id!.in.includes(r.id as string)).map((r) => ({ id: r.id }));

        return rows.filter((r) => r.campaignId === where.campaignId).map((r) => ({ ...r }));
      },
    };
  }

  return { db: db as unknown as TemplateDb, store };
}
