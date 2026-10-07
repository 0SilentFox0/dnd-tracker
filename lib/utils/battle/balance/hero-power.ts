import { getCharacterStats, magicMainSkillIds } from "./index";

import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import type { CampaignSpellContext } from "@/lib/utils/battle/types/participant";
import { branchLevels, normalizeTree, resolveLearned } from "@/lib/utils/skills/progression";
import type { BattleParticipant } from "@/types/battle";

/** Same numbers for the setup UI and the battle start: the participant as built from the character, auras baked alone. */
export function heroPower(built: BattleParticipant, character: { race: string; skillTreeProgress?: unknown }, campaignContext: CampaignSpellContext | undefined) {
  const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

  const treeRow = campaignContext?.skillTreeByRace[character.race];

  const levels = treeRow ? branchLevels(resolveLearned(normalizeTree(treeRow), character.skillTreeProgress)) : {};

  const magic = magicMainSkillIds(campaignContext?.mainSkills ?? []);

  return { levels, stats: getCharacterStats({ participant, branchLevels: levels, magicMainSkillIds: magic }) };
}
