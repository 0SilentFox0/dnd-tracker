import type { Prisma } from "@prisma/client";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { type CharacterLogInput, writeCharacterLog } from "@/lib/server/characters/log";
import { applyBattleResult, battleResultLogData } from "@/lib/utils/characters/resources/battle";
import { readResources } from "@/lib/utils/characters/resources/schema";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export function persistedHeroes(participants: BattleParticipant[]): BattleParticipant[] {
  const seen = new Set<string>();

  return participants.filter((p) => {
    const { sourceType, sourceId, isExtraTurnSlot } = p.basicInfo;

    if (sourceType !== ParticipantSourceType.CHARACTER || isExtraTurnSlot || seen.has(sourceId)) return false;

    seen.add(sourceId);

    return true;
  });
}

export async function persistCharacterResources(
  tx: Pick<Prisma.TransactionClient, "character" | "characterLog">,
  battle: { campaignId: string; battleId: string; rules: Ruleset },
  participants: BattleParticipant[],
): Promise<void> {
  const { persistResources, inspiration } = battle.rules.outOfCombat;

  if (!persistResources && !inspiration) return;

  const heroes = persistedHeroes(participants);

  if (heroes.length === 0) return;

  const rows = await tx.character.findMany({ where: { id: { in: heroes.map((h) => h.basicInfo.sourceId) }, campaignId: battle.campaignId }, select: { id: true, resources: true } });

  const byId = new Map(rows.map((r) => [r.id, r]));

  const logs: CharacterLogInput[] = [];

  for (const hero of heroes) {
    const row = byId.get(hero.basicInfo.sourceId);

    if (!row) continue;

    const before = readResources(row.resources);

    if (persistResources) await tx.character.update({ where: { id: row.id }, data: { resources: applyBattleResult(before, hero) as Prisma.InputJsonValue } });

    if (inspiration && hero.battleData.inspirationSpent) await tx.character.updateMany({ where: { id: row.id, inspiration: true }, data: { inspiration: false } });

    if (persistResources) logs.push({ campaignId: battle.campaignId, characterId: row.id, actorUserId: null, kind: CharacterLogKind.BATTLE_RESULT, data: battleResultLogData(before, hero, battle.battleId) });
  }

  await writeCharacterLog(tx, logs);
}
