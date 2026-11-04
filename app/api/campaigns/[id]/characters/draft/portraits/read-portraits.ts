import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";

const PORTRAITS_PER_RACE = 50;

const ALL_RACES_ROW_LIMIT = 2000;

/** One race → `{ portraits }`; no race → `{ pools }` for every race of the campaign. */
export async function readDraftPortraits(campaignId: string, race?: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const races = await prisma.race.findMany({ where: { campaignId, ...(race ? { name: race } : {}) }, select: { id: true, name: true } });

  const raceById = new Map(races.map((r) => [r.id, r]));

  const found = await prisma.unit.findMany({
    where: { campaignId, avatar: { not: "" }, raceId: { in: [...raceById.keys()] } },
    select: { avatar: true, raceId: true },
    orderBy: { id: "asc" },
    take: race ? PORTRAITS_PER_RACE : ALL_RACES_ROW_LIMIT,
  });

  const units = found.map((u) => ({ avatar: u.avatar, race: u.raceId ? (raceById.get(u.raceId) ?? null) : null }));

  if (race) return NextResponse.json({ portraits: units.flatMap((u) => (u.avatar ? [u.avatar] : [])) });

  const pools = new Map<string, string[]>();

  for (const u of units) {
    if (!u.avatar || !u.race) continue;

    const pool = pools.get(u.race.name) ?? [];

    if (pool.length < PORTRAITS_PER_RACE) pool.push(u.avatar);

    pools.set(u.race.name, pool);
  }

  return NextResponse.json({ pools: Object.fromEntries(pools) });
}
