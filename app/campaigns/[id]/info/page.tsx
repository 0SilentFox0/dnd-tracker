import Link from "next/link";

import { InfoReferenceClient } from "@/components/campaigns/info/InfoReferenceClient";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { requireCampaignMember } from "@/lib/campaigns/access";
import { prisma } from "@/lib/db";
import { abilitySummary } from "@/lib/utils/abilities/summary";

export default async function CampaignInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;

  const { isDM } = await requireCampaignMember(campaignId);

  const [skills, spells] = await Promise.all([
    prisma.skill.findMany({
      omit: { spellEnhancementData: true },
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

  const skillsForClient = skills.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    appearanceDescription: s.appearanceDescription ?? null,
    abilitySummary: abilitySummary("skill", s),
    mainSkillId: s.mainSkill?.id ?? null,
    mainSkillName: s.mainSkill?.name ?? null,
    mainSkillIcon: s.mainSkill?.icon ?? null,
    mainSkillColor: s.mainSkill?.color ?? null,
    grantedSpellName: s.grantedSpell?.name ?? null,
    icon: s.icon ?? null,
    image: s.image ?? null,
  }));

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
    <HudPage width="md">
      <HudPageHeader
        title="Інформація — Довідник"
        subtitle="Усі скіли та заклинання кампанії: як діють, опис вигляду. Для гравців — ознайомлення з механіками."
        actions={
          <Link href={`/campaigns/${campaignId}`} className="shrink-0">
            <Button variant="outline" className="min-h-11 touch-manipulation sm:min-h-9">
              Назад до кампанії
            </Button>
          </Link>
        }
      />

      <InfoReferenceClient
        campaignId={campaignId}
        skills={skillsForClient}
        spells={spellsForClient}
        isDM={isDM}
      />
    </HudPage>
  );
}
