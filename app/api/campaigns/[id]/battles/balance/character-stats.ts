import { buildCampaignContextForStart } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-build-context";
import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { getCharacterStats, magicMainSkillIds } from "@/lib/utils/battle/balance";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";
import { branchLevels, normalizeTree, resolveLearned } from "@/lib/utils/skills/progression";

/** Same participants as at battle start, from one context load (no per-character queries). */
export async function loadCharacterBalanceStats(campaignId: string, characterIds?: string[]) {
  const characters = await prisma.character.findMany({
    where: { campaignId, ...(characterIds && { id: { in: characterIds } }) },
    include: { inventory: true },
  });

  if (characters.length === 0) return [];

  const { campaignContext } = await buildCampaignContextForStart(campaignId, characters, []);

  const magic = magicMainSkillIds(campaignContext?.mainSkills ?? []);

  return Promise.all(
    characters.map(async (character) => {
      const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY, undefined, campaignContext);

      const [participant] = applyBakedAuras([built], new Set([built.basicInfo.id]));

      const treeRow = campaignContext?.skillTreeByRace[character.race];

      const levels = treeRow ? branchLevels(resolveLearned(normalizeTree(treeRow), character.skillTreeProgress)) : {};

      return { character, levels, stats: getCharacterStats({ participant, branchLevels: levels, magicMainSkillIds: magic }) };
    }),
  );
}
