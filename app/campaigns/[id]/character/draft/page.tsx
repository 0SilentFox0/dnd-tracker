import { redirect } from "next/navigation";

import { PlayerDraftForm } from "@/components/characters/player-draft/PlayerDraftForm";
import { CharacterStatus, CharacterType } from "@/lib/constants/characters";
import { HERO_ARCHETYPE_KEYS } from "@/lib/constants/hero-archetypes";
import { prisma } from "@/lib/db";
import { requireCampaignMember } from "@/lib/server/campaigns/access";
import { validateAbilityScores } from "@/lib/utils/characters/generate";
import type { DraftInput } from "@/types/characters";

export default async function PlayerDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId } = await requireCampaignMember(id);

  const c = await prisma.character.findFirst({
    where: { campaignId: id, controlledBy: userId, type: CharacterType.PLAYER, status: CharacterStatus.PENDING },
    select: {
      id: true,
      name: true,
      race: true,
      class: true,
      archetype: true,
      alignment: true,
      background: true,
      avatar: true,
      strength: true,
      dexterity: true,
      constitution: true,
      intelligence: true,
      wisdom: true,
      charisma: true,
      primaryAbility: true,
      goals: true,
    },
  });

  if (!c) redirect(`/campaigns/${id}/character`);

  const scores = { strength: c.strength, dexterity: c.dexterity, constitution: c.constitution, intelligence: c.intelligence, wisdom: c.wisdom, charisma: c.charisma };

  const archetype = HERO_ARCHETYPE_KEYS.find((k) => k === c.archetype) ?? "warrior";

  const initial: DraftInput = {
    name: c.name,
    race: c.race,
    class: c.class,
    archetype,
    alignment: c.alignment ?? undefined,
    background: c.background ?? undefined,
    avatar: c.avatar ?? undefined,
    method: validateAbilityScores(scores, "standard") ? "standard" : "pointBuy",
    ...scores,
    primaryAbility: (c.primaryAbility as DraftInput["primaryAbility"]) ?? undefined,
    goals: ((c.goals as Array<{ text: string; kind: NonNullable<DraftInput["goals"]>[number]["kind"] }> | null) ?? []).map(({ text, kind }) => ({ text, kind })),
  };

  return <PlayerDraftForm campaignId={id} characterId={c.id} initial={initial} />;
}
