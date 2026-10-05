import type { Prisma } from "@prisma/client";

import { pickSkillEntries, type SkillEntry } from "@/lib/utils/abilities/build/collect";
import type { SpellEnhancer } from "@/types/abilities";

export function extractSpellEnhancements(
  skill: Prisma.SkillGetPayload<object>,
): SpellEnhancer["spellEnhancements"] | undefined {
  const enhancementTypes = (skill.spellEnhancementTypes as string[]) || [];

  const enhancementDataRaw =
    skill.spellEnhancementData &&
    typeof skill.spellEnhancementData === "object" &&
    !Array.isArray(skill.spellEnhancementData)
      ? (skill.spellEnhancementData as {
          spellAllowMultipleTargets?: boolean;
          spellAoeSpellIds?: unknown;
        })
      : {};

  const spellAllowMultipleTargets =
    enhancementDataRaw.spellAllowMultipleTargets === true;

  const spellAoeSpellIds = Array.isArray(enhancementDataRaw.spellAoeSpellIds)
    ? enhancementDataRaw.spellAoeSpellIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];

  const hasAny =
    enhancementTypes.length > 0 ||
    skill.spellEffectIncrease ||
    skill.spellTargetChange ||
    skill.spellAdditionalModifier ||
    skill.spellNewSpellId ||
    spellAllowMultipleTargets ||
    spellAoeSpellIds.length > 0;

  if (!hasAny) return undefined;

  const out: SpellEnhancer["spellEnhancements"] = {};

  if (skill.spellEffectIncrease) {
    out.spellEffectIncrease = skill.spellEffectIncrease;
  }

  if (skill.spellTargetChange) {
    const tc = skill.spellTargetChange as unknown as { target: string };

    if (tc && typeof tc === "object" && "target" in tc) {
      out.spellTargetChange = { target: tc.target };
    }
  }

  if (skill.spellAdditionalModifier) {
    const am = skill.spellAdditionalModifier as unknown as {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    };

    if (am && typeof am === "object") {
      out.spellAdditionalModifier = {
        modifier: am.modifier,
        damageDice: am.damageDice,
        duration: am.duration,
      };
    }
  }

  if (skill.spellNewSpellId) out.spellNewSpellId = skill.spellNewSpellId;

  if (spellAllowMultipleTargets) out.spellAllowMultipleTargets = true;

  if (spellAoeSpellIds.length > 0) out.spellAoeSpellIds = spellAoeSpellIds;

  return out;
}

export function buildSpellEnhancers(entries: Array<SkillEntry & { row: Prisma.SkillGetPayload<object> }>): SpellEnhancer[] {
  const out: SpellEnhancer[] = [];

  for (const entry of pickSkillEntries(entries) as Array<SkillEntry & { row: Prisma.SkillGetPayload<object> }>) {
    const spellEnhancements = extractSpellEnhancements(entry.row);

    if (!spellEnhancements) continue;

    out.push({
      skillId: entry.row.id,
      name: entry.row.name,
      mainSkillId: entry.mainSkillId,
      level: entry.level,
      linkedSpellId: entry.row.spellId ?? null,
      spellGroupId: entry.row.spellGroupId ?? entry.mainSkillSpellGroupId,
      spellEnhancements,
    });
  }

  return out;
}
