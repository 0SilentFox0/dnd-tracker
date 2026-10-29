import type { Prisma } from "@prisma/client";

import "server-only";
import { prisma } from "@/lib/db";
import type { CustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import type { ConditionUsage } from "@/types/campaigns";

type Db = Pick<Prisma.TransactionClient, "$queryRaw">;

interface BattleRow {
  id: string;
  name: string;
  status: string;
  participant: string | null;
}

interface NamedRow {
  id: string;
  name: string;
}

export async function findCustomConditionUsage(campaignId: string, key: CustomConditionKey, db: Db = prisma): Promise<ConditionUsage> {
  const pattern = `%"${key}"%`;

  const [battleRows, spells, units, skills, artifacts, artifactSets, races, feats, statusEffects] = await Promise.all([
    db.$queryRaw<BattleRow[]>`
      SELECT bs.id, bs.name, bs.status, bp.snapshot->'basicInfo'->>'name' AS participant
      FROM battle_participants bp JOIN battle_scenes bs ON bs.id = bp."battleId"
      WHERE bs."campaignId" = ${campaignId} AND bs.status IN ('prepared', 'active') AND (bp.snapshot::text LIKE ${pattern} OR bp.state::text LIKE ${pattern})
      ORDER BY bs.name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM spells
      WHERE "campaignId" = ${campaignId} AND ("spellEffects"::text LIKE ${pattern} OR targeting::text LIKE ${pattern})
      ORDER BY name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM units
      WHERE "campaignId" = ${campaignId} AND abilities::text LIKE ${pattern}
      ORDER BY name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM skills
      WHERE "campaignId" = ${campaignId} AND abilities::text LIKE ${pattern}
      ORDER BY name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM artifacts
      WHERE "campaignId" = ${campaignId} AND (abilities::text LIKE ${pattern} OR modifiers::text LIKE ${pattern})
      ORDER BY name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM artifact_sets
      WHERE "campaignId" = ${campaignId} AND (abilities::text LIKE ${pattern} OR "setBonus"::text LIKE ${pattern})
      ORDER BY name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM races
      WHERE "campaignId" = ${campaignId} AND (abilities::text LIKE ${pattern} OR choices::text LIKE ${pattern} OR "passiveAbility"::text LIKE ${pattern})
      ORDER BY name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM feats
      WHERE "campaignId" = ${campaignId} AND (abilities::text LIKE ${pattern} OR choices::text LIKE ${pattern})
      ORDER BY name`,
    db.$queryRaw<NamedRow[]>`
      SELECT id, name FROM status_effects
      WHERE effects::text LIKE ${pattern}
      ORDER BY name`,
  ]);

  const battles = new Map<string, ConditionUsage["battles"][number]>();

  for (const row of battleRows) {
    const entry = battles.get(row.id) ?? { id: row.id, name: row.name, status: row.status, participants: [] };

    if (row.participant) entry.participants.push(row.participant);

    battles.set(row.id, entry);
  }

  return { battles: [...battles.values()], spells, units, skills, artifacts, artifactSets, races, feats, statusEffects };
}

export const isConditionUsed = (u: ConditionUsage) => Object.values(u).some((list) => list.length > 0);
