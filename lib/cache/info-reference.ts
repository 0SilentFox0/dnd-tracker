import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";

import { REFERENCE_REVALIDATE_SECONDS } from "@/lib/cache/reference-data";
import { cacheTags } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { costLabel, resolutionLabel, targetingLabel } from "@/lib/utils/spells/model/labels";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { SkillForReference, SpellForReference } from "@/types/info-reference";

const SKILL_SELECT = {
  id: true,
  name: true,
  description: true,
  appearanceDescription: true,
  abilities: true,
  icon: true,
  image: true,
  mainSkill: { select: { id: true, name: true, icon: true, color: true } },
  grantedSpell: { select: { name: true } },
} satisfies Prisma.SkillSelect;

const SPELL_SELECT = {
  id: true,
  name: true,
  level: true,
  description: true,
  dice: true,
  cost: true,
  targeting: true,
  resolution: true,
  spellEffects: true,
  appearanceDescription: true,
  icon: true,
  spellGroup: { select: { name: true } },
} satisfies Prisma.SpellSelect;

export interface InfoReference {
  skills: SkillForReference[];
  spells: SpellForReference[];
}

export async function loadInfoReference(campaignId: string): Promise<InfoReference> {
  const [skills, spells] = await Promise.all([
    prisma.skill.findMany({ where: { campaignId }, select: SKILL_SELECT, orderBy: { createdAt: "desc" } }),
    prisma.spell.findMany({ where: { campaignId }, select: SPELL_SELECT, orderBy: [{ level: "asc" }, { name: "asc" }] }),
  ]);

  return {
    skills: skills.map((s) => ({
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
    })),
    spells: spells.map((s) => {
      const def = readSpellDefinition(s);

      return {
        id: s.id,
        name: s.name,
        level: s.level,
        type: targetingLabel(def.targeting),
        cost: costLabel(def.cost),
        resolution: resolutionLabel(def.resolution),
        dice: def.dice,
        description: s.description,
        effects: def.effects.map(describeEffect),
        appearanceDescription: s.appearanceDescription ?? null,
        groupName: s.spellGroup?.name ?? null,
        icon: s.icon ?? null,
      };
    }),
  };
}

export function getCachedInfoReference(campaignId: string): Promise<InfoReference> {
  const tags = [cacheTags.skills(campaignId), cacheTags.mainSkills(campaignId), cacheTags.spells(campaignId)];

  return unstable_cache(() => loadInfoReference(campaignId), ["info-reference", campaignId], { tags, revalidate: REFERENCE_REVALIDATE_SECONDS })();
}
