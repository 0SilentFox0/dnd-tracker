import Link from "next/link";
import { redirect } from "next/navigation";

import { InfoReferenceClient } from "@/components/campaigns/info/InfoReferenceClient";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CampaignInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;

  const user = await getAuthUser();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: { where: { userId: user.id } },
    },
  });

  if (!campaign || campaign.members.length === 0) {
    redirect("/campaigns");
  }

  const isDM = campaign.members[0]?.role === "dm";

  const [skills, spells] = await Promise.all([
    prisma.skill.findMany({
      where: { campaignId },
      include: {
        mainSkill: true,
        spell: true,
        grantedSpell: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.spell.findMany({
      where: { campaignId },
      include: { spellGroup: true },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    }),
  ]);

  const skillsForClient = skills.map((s) => {
    const basicInfo =
      s.basicInfo && typeof s.basicInfo === "object" && !Array.isArray(s.basicInfo)
        ? (s.basicInfo as Record<string, unknown>)
        : {};

    return {
      id: s.id,
      name: (basicInfo.name as string) || s.name,
      description: (basicInfo.description as string) || s.description,
      appearanceDescription: (s as { appearanceDescription?: string | null }).appearanceDescription ?? null,
      combatStats: s.combatStats,
      bonuses: s.bonuses,
      skillTriggers: s.skillTriggers,
      mainSkillName: s.mainSkill?.name ?? null,
      grantedSpellName: s.grantedSpell?.name ?? null,
      icon: s.icon ?? null,
      image: s.image ?? null,
    };
  });

  const spellsForClient = spells.map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    type: s.type,
    damageType: s.damageType,
    castingTime: s.castingTime,
    range: s.range,
    duration: s.duration,
    description: s.description,
    effects: Array.isArray(s.effects) ? (s.effects as string[]) : [],
    savingThrow: s.savingThrow,
    diceCount: s.diceCount,
    diceType: s.diceType,
    damageElement: s.damageElement,
    appearanceDescription: (s as { appearanceDescription?: string | null }).appearanceDescription ?? null,
    groupName: s.spellGroup?.name ?? null,
    icon: s.icon ?? null,
  }));

  return (
    <div className="container mx-auto px-4 py-4 sm:p-4 max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Інформація — Довідник</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Усі скіли та заклинання кампанії: як діють, опис вигляду. Для гравців — ознайомлення з механіками.
          </p>
        </div>
        <Link href={`/campaigns/${campaignId}`} className="shrink-0">
          <Button variant="outline" className="w-full sm:w-auto min-h-11 sm:min-h-9">
            Назад до кампанії
          </Button>
        </Link>
      </div>

      <InfoReferenceClient
        campaignId={campaignId}
        skills={skillsForClient}
        spells={spellsForClient}
        isDM={isDM}
      />
    </div>
  );
}
