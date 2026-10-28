
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { addExperience, xpShare } from "@/lib/constants/experience";
import { prisma } from "@/lib/db";
import type { ExperienceInput } from "@/lib/schemas/out-of-combat";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { ContentError } from "@/lib/server/content/errors";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";

export async function awardExperience(access: CampaignAccessResult, body: ExperienceInput) {
  const { campaign } = access;

  if (!campaign.rules.outOfCombat.xp) throw new ContentError(API_ERRORS.OOC_XP_DISABLED, 409);

  const ids = [...new Set(body.characterIds)];

  const characters = await prisma.character.findMany({ where: { id: { in: ids }, campaignId: campaign.id, status: CharacterStatus.ACTIVE }, select: { id: true, experience: true } });

  if (characters.length !== ids.length) throw new ContentError(API_ERRORS.XP_CHARACTERS_INVALID, 400);

  const share = xpShare(body.amount, ids.length, body.split);

  if (share === 0) return { characters: characters.map((c) => ({ id: c.id, experience: c.experience })) };

  const updated = await prisma.$transaction(async (tx) => {
    const locked = await lockCharacters(tx, ids);

    const awarded = characters.map((c) => ({ id: c.id, experience: addExperience(locked.get(c.id)?.experience ?? c.experience, share) }));

    for (const u of awarded) await tx.character.update({ where: { id: u.id }, data: { experience: u.experience } });

    await writeCharacterLog(tx, awarded.map((u) => ({ campaignId: campaign.id, characterId: u.id, actorUserId: access.userId, kind: CharacterLogKind.XP, data: { amount: share, total: u.experience, ...(body.note && { note: body.note }) } })));

    return awarded;
  });

  return { characters: updated };
}
