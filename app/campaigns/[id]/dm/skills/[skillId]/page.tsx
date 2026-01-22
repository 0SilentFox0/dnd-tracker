import { getAuthUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SkillCreateForm } from "@/components/skills/SkillCreateForm";
import type { Race } from "@/types/races";
import type { SkillTriggers } from "@/types/skill-triggers";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string; skillId: string }>;
}) {
  const { id, skillId } = await params;
  const user = await getAuthUser();
  const userId = user.id;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign || campaign.members[0]?.role !== "dm") {
    redirect(`/campaigns/${id}`);
  }

  const skill = await prisma.skill.findUnique({
    where: { id: skillId },
  });

  if (!skill || skill.campaignId !== id) {
    notFound();
  }

  const spells = await prisma.spell.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const spellGroups = await prisma.spellGroup.findMany({
    where: { campaignId: id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const races = await prisma.race.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <SkillCreateForm
        campaignId={id}
        spells={spells}
        spellGroups={spellGroups}
        initialRaces={races.map((race) => ({
          ...race,
          availableSkills: Array.isArray(race.availableSkills)
            ? (race.availableSkills as string[])
            : [],
          disabledSkills: Array.isArray(race.disabledSkills)
            ? (race.disabledSkills as string[])
            : [],
          passiveAbility: race.passiveAbility
            ? typeof race.passiveAbility === "object" &&
              race.passiveAbility !== null &&
              !Array.isArray(race.passiveAbility)
              ? (race.passiveAbility as unknown as Race["passiveAbility"])
              : null
            : null,
          spellSlotProgression: Array.isArray(race.spellSlotProgression)
            ? (race.spellSlotProgression as unknown as Race["spellSlotProgression"])
            : undefined,
          createdAt: race.createdAt,
          updatedAt: race.updatedAt,
        }))}
        initialData={{
          ...skill,
          races: Array.isArray(skill.races) ? skill.races : [],
          bonuses: typeof skill.bonuses === "object" && skill.bonuses !== null
            ? (skill.bonuses as Record<string, number>)
            : {},
          spellEnhancementTypes: Array.isArray(skill.spellEnhancementTypes)
            ? (skill.spellEnhancementTypes as string[])
            : undefined,
          spellTargetChange:
            skill.spellTargetChange &&
            typeof skill.spellTargetChange === "object" &&
            skill.spellTargetChange !== null &&
            !Array.isArray(skill.spellTargetChange) &&
            "target" in skill.spellTargetChange
              ? (skill.spellTargetChange as { target: string })
              : null,
          spellAdditionalModifier:
            skill.spellAdditionalModifier &&
            typeof skill.spellAdditionalModifier === "object" &&
            skill.spellAdditionalModifier !== null &&
            !Array.isArray(skill.spellAdditionalModifier)
              ? (skill.spellAdditionalModifier as {
                  modifier?: string;
                  damageDice?: string;
                  duration?: number;
                })
              : null,
          skillTriggers: Array.isArray(skill.skillTriggers)
            ? (skill.skillTriggers as unknown as SkillTriggers)
            : undefined,
        }}
      />
    </div>
  );
}
