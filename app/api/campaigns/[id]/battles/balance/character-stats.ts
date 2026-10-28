import { buildCampaignContextForStart } from "@/app/api/campaigns/[id]/battles/[battleId]/start/start-build-context";
import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { heroPower } from "@/lib/utils/battle/balance/hero-power";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant";

/** Same participants as at battle start, from one context load (no per-character queries). */
export async function loadCharacterBalanceStats(campaignId: string, characterIds?: string[]) {
  const characters = await prisma.character.findMany({
    where: { campaignId, ...(characterIds && { id: { in: characterIds } }) },
    include: { inventory: true },
  });

  if (characters.length === 0) return [];

  const { campaignContext } = await buildCampaignContextForStart(campaignId, characters, []);

  return Promise.all(
    characters.map(async (character) => {
      const built = await createBattleParticipantFromCharacter(character, "", ParticipantSide.ALLY, undefined, campaignContext);

      return { character, ...heroPower(built, character, campaignContext) };
    }),
  );
}
