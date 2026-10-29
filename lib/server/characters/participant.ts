import { ParticipantSide } from "@/lib/constants/battle";
import { type CharacterContext, loadCharacterContext } from "@/lib/server/battles/participant/load-character-context";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import type { CharacterFromPrisma } from "@/lib/utils/battle/types/participant";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

/** Учасник з листа: той самий шлях, що й старт бою (ресурси, виснаження, аури). */
export async function buildCharacterParticipant(character: CharacterFromPrisma, campaign: { maxLevel: number; rules: Ruleset }): Promise<CharacterContext & { participant: BattleParticipant }> {
  const loaded = await loadCharacterContext(character, campaign);

  const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY, undefined, loaded.context, { classEntries: loaded.classEntries });

  const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

  return { ...loaded, participant };
}
