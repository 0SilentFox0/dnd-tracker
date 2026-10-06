import type { Prisma } from "@prisma/client";

import type { ProgressionContext } from "./load-progression-context";

import { prisma } from "@/lib/db";
import { skillAbilities } from "@/lib/utils/abilities/read";
import { damageAffinity } from "@/lib/utils/abilities/sheet-bonuses";
import { abilitySummary } from "@/lib/utils/abilities/summary";
import { normalizeTree, readTreeJson, readUnlocked, stripTreeForClient } from "@/lib/utils/skills/progression";
import { toSpellSkillInfo } from "@/lib/utils/spells";
import type { CharacterProgressionDto } from "@/types/progression";

// combatStats/bonuses/skillTriggers/spellData потрібні legacy-читачам до контракту (§6.5)
export const PROGRESSION_SKILL_SELECT = {
  id: true,
  name: true,
  icon: true,
  description: true,
  abilities: true,
  spellGroupId: true,
  spellNewSpellId: true,
  spellData: true,
  spellEnhancementData: true,
  combatStats: true,
  bonuses: true,
  skillTriggers: true,
} satisfies Prisma.SkillSelect;

export async function buildProgressionDto(campaignId: string, ctx: ProgressionContext): Promise<CharacterProgressionDto> {
  const { character, treeRow, isDM, isOwner } = ctx;

  const race = await prisma.race.findFirst({ where: { campaignId, name: character.race }, select: { icon: true } });

  const base = { race: character.race, raceIcon: race?.icon ?? null, level: character.level, seenLevel: character.seenLevel, isOwner, isDM };

  if (!treeRow) return { ...base, treeId: null, tree: null, unlocked: [], skills: {}, branches: {} };

  const tree = normalizeTree(treeRow);

  const skillIds = [...new Set([...tree.nodes.values()].map((n) => n.skillId).filter((id): id is string => !!id))];

  const [skills, mainSkills] = await Promise.all([
    skillIds.length ? prisma.skill.findMany({ where: { campaignId, id: { in: skillIds } }, select: PROGRESSION_SKILL_SELECT }) : [],
    prisma.mainSkill.findMany({ where: { campaignId, id: { in: tree.branches.map((b) => b.id) } }, select: { id: true, name: true, color: true, icon: true, spellGroupId: true } }),
  ]);

  return {
    ...base,
    treeId: tree.treeId,
    tree: stripTreeForClient(readTreeJson(treeRow.skills)),
    unlocked: readUnlocked(tree, character.skillTreeProgress),
    skills: Object.fromEntries(
      skills.map((s) => [
        s.id,
        {
          name: s.name,
          icon: s.icon ?? null,
          summary: abilitySummary("skill", s),
          description: s.description ?? "",
          ...toSpellSkillInfo(s as never),
          damageAffinity: damageAffinity(skillAbilities(s)),
        },
      ]),
    ),
    branches: Object.fromEntries(
      tree.branches.map((b) => {
        const ms = mainSkills.find((m) => m.id === b.id);

        return [b.id, { name: ms?.name ?? b.name, color: ms?.color ?? b.color, icon: ms?.icon ?? b.icon, spellGroupId: ms?.spellGroupId ?? b.spellGroupId }];
      }),
    ),
  };
}
