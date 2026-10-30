import type { Prisma } from "@prisma/client";

import type { NewBattleEvent } from "./types";

import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { addExperience } from "@/lib/constants/experience";
import type { Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { lockCharacters } from "@/lib/server/characters/lock";
import { type CharacterLogInput, writeCharacterLog } from "@/lib/server/characters/log";
import { autoXpEnabled, battleXpAward } from "@/lib/utils/battle/turn/battle-xp";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export function isVictoryOutcome(events: NewBattleEvent[]): boolean {
  return events.some((e) => (e.details?.actionDetails as { battleResult?: string } | undefined)?.battleResult === "victory");
}

export async function persistBattleXp(
  tx: Pick<Prisma.TransactionClient, "character" | "characterLog" | "$queryRaw">,
  battle: { campaignId: string; battleId: string; rules: Ruleset; locale: Locale },
  participants: BattleParticipant[],
  events: NewBattleEvent[],
): Promise<void> {
  if (!autoXpEnabled(battle.rules) || !isVictoryOutcome(events)) return;

  const award = battleXpAward(participants);

  if (!award) return;

  const rows = await tx.character.findMany({ where: { id: { in: award.characterIds }, campaignId: battle.campaignId, status: CharacterStatus.ACTIVE }, select: { id: true } });

  if (rows.length === 0) return;

  const note = (await getTranslator(battle.locale, "characterProfile"))("battleXpNote");

  const locked = await lockCharacters(tx, rows.map((r) => r.id));

  const logs: CharacterLogInput[] = [];

  await tx.character.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { experience: { increment: award.share } } });

  for (const { id } of rows) {
    const total = addExperience(locked.get(id)?.experience ?? 0, award.share);

    logs.push({ campaignId: battle.campaignId, characterId: id, actorUserId: null, kind: CharacterLogKind.XP, data: { amount: award.share, total, note, battleId: battle.battleId } });
  }

  await writeCharacterLog(tx, logs);
}
