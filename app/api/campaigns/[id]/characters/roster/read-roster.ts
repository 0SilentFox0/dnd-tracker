import { NextResponse } from "next/server";

import type { CharacterTypeValue } from "@/lib/constants/characters";
import { ACTIVE_CHARACTER } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { isUniqueRow } from "@/lib/utils/items/item-row";
import { refArtifactIds } from "@/lib/utils/items/ref";
import { resolveItemRow } from "@/lib/utils/items/resolve";
import type { RosterHero } from "@/types/characters";

const urlOnly = (avatar: string | null) => (avatar?.startsWith("http") ? avatar : null);

export async function readRoster(campaignId: string): Promise<NextResponse> {
  const access = await requireCampaignAccess(campaignId);

  if (access instanceof NextResponse) return access;

  const heroes = await prisma.character.findMany({
    where: { campaignId, ...ACTIVE_CHARACTER },
    select: { id: true, name: true, avatar: true, type: true, inventory: { select: { equipped: true } } },
    orderBy: { name: "asc" },
  });

  const slotsOf = (h: (typeof heroes)[number]) =>
    Object.entries((h.inventory?.equipped as Record<string, string | undefined>) ?? {}).filter((e): e is [string, string] => !!e[1]);

  const ids = [...new Set(heroes.flatMap((h) => slotsOf(h).flatMap(([, ref]) => refArtifactIds(ref))))];

  const artifacts = ids.length ? await prisma.artifact.findMany({ where: { id: { in: ids }, campaignId }, select: { id: true, name: true, slot: true, modifiers: true } }) : [];

  const byId = new Map(artifacts.map((a) => [a.id, a]));

  const roster: RosterHero[] = heroes.map((h) => ({
    id: h.id,
    name: h.name,
    avatar: urlOnly(h.avatar),
    type: h.type as CharacterTypeValue,
    equipped: Object.fromEntries(
      slotsOf(h).flatMap(([slot, ref]) => {
        const row = resolveItemRow(ref, byId);

        return row ? [[slot, { id: ref, name: row.name, ...(!isUniqueRow(row) && { gear: true as const }) }]] : [];
      }),
    ),
  }));

  return NextResponse.json(roster);
}
