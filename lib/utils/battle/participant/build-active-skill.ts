/**
 * Чисті хелпери для побудови ActiveSkill із Skill row (Prisma).
 *
 * Винесено з extract-skills.ts (CODE_AUDIT 1.7) — головна функція
 * `extractActiveSkillsFromCharacter` стає orchestrator-ом, а ця
 * деталізація:
 *  - parseSkillEffects:       combatStats / bonuses → SkillEffect[]
 *  - extractSpellEnhancements: skill row → spellEnhancements | undef
 *  - inferDamageType:         effects + signals → melee/ranged/magic
 *  - buildActiveSkillFromRow: композиція всього вище
 */

import type { Prisma } from "@prisma/client";

import { inferLevelFromSkillName } from "./parse";

import { safeParseOrDefault, skillCombatStatsSchema } from "@/lib/schemas";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, SkillEffect } from "@/types/battle";
import type { SkillTriggers } from "@/types/skill-triggers";

type RawEffect = {
  stat: string;
  type: string;
  value?: number | string | boolean;
  duration?: number;
  target?: "self" | "enemy" | "all_enemies" | "all_allies" | "all";
  maxTriggers?: number | null;
};

export type CombatStatsEffects = {
  effects?: RawEffect[];
  affectsDamage?: boolean;
  damageType?: "melee" | "ranged" | "magic" | null;
};

const PERCENT_DAMAGE_KEYS = [
  "melee_damage",
  "ranged_damage",
  "counter_damage",
];

/**
 * Будує SkillEffect[] з combatStats (новий формат) або bonuses (legacy).
 * При наявності combatStats.effects — використовує його; інакше fallback
 * на skill.bonuses (старий формат) і нормалізує percent stats.
 */
export function parseSkillEffects(
  combatStats: CombatStatsEffects,
  bonuses: Record<string, unknown> | null | undefined,
): SkillEffect[] {
  const rawEffects = Array.isArray(combatStats.effects)
    ? combatStats.effects
    : [];

  if (rawEffects.length > 0) {
    return rawEffects
      .filter((e) => e.stat || (e as { type?: string }).type)
      .map((e) => {
        const raw = e as RawEffect & { isPercentage?: boolean };

        const isPct =
          raw.isPercentage === true ||
          e.type === "percent" ||
          e.type === "percentage";

        const stat = e.stat || (e as { type?: string }).type || "";

        return {
          stat,
          type: e.type || "flat",
          value: e.value ?? 0,
          isPercentage: isPct,
          duration: e.duration,
          ...(raw.target != null && { target: raw.target }),
          ...(raw.maxTriggers != null && { maxTriggers: raw.maxTriggers }),
        };
      });
  }

  // Legacy bonuses → effects fallback.
  const safeBonuses = (bonuses ?? {}) as Record<string, number>;

  return Object.entries(safeBonuses).map(([key, value]) => ({
    stat: key,
    type:
      PERCENT_DAMAGE_KEYS.includes(key) || key.includes("percent")
        ? "percent"
        : "flat",
    value,
    isPercentage:
      key.includes("percent") ||
      key.includes("_percent") ||
      PERCENT_DAMAGE_KEYS.includes(key),
  }));
}

/**
 * Збирає spellEnhancements з Skill row.
 * Повертає undefined якщо жодного enhancement-поля не задано
 * (щоб не утворювати порожні об'єкти).
 */
export function extractSpellEnhancements(
  skill: Prisma.SkillGetPayload<object>,
): ActiveSkill["spellEnhancements"] | undefined {
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

  const out: NonNullable<ActiveSkill["spellEnhancements"]> = {};

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

const MAGIC_DAMAGE_RE = /^(spell|magic)_damage$|_spell_damage$/;

/**
 * Визначає damageType з різних сигналів.
 *
 * Пріоритет:
 *  1. Явний combatStats.damageType (override з даних), коли немає
 *     conflict-у з ranged-only / melee-only effects.
 *  2. Auto-detect з effects: ranged_damage / melee_damage stats.
 *  3. Magic signals: *_spell_damage effects, spellEffectIncrease,
 *     spellEnhancement*, spellGroupId binding.
 */
export function inferDamageType(
  combatStats: CombatStatsEffects,
  effects: SkillEffect[],
  signals: {
    spellEffectIncrease?: number | null;
    enhancementTypes: string[];
    spellTargetChange?: unknown;
    spellAdditionalModifier?: unknown;
    spellGroupId?: string | null;
  },
): "melee" | "ranged" | "magic" | null {
  let damageType: "melee" | "ranged" | "magic" | null =
    (combatStats.damageType as "melee" | "ranged" | "magic" | null) ?? null;

  const hasRanged = effects.some((e) => e.stat === "ranged_damage");

  const hasMelee = effects.some((e) => e.stat === "melee_damage");

  const hasMagicEffect = effects.some((e) => {
    const stat = (e.stat || "").toLowerCase();

    return (
      MAGIC_DAMAGE_RE.test(stat) ||
      (stat.includes("magic") && stat.includes("damage"))
    );
  });

  const hasMagicSignal =
    hasMagicEffect ||
    !!signals.spellEffectIncrease ||
    signals.enhancementTypes.length > 0 ||
    !!signals.spellTargetChange ||
    !!signals.spellAdditionalModifier ||
    !!signals.spellGroupId;

  if (damageType == null || !damageType.length) {
    if (hasRanged && !hasMelee) damageType = "ranged";
    else if (hasMelee && !hasRanged) damageType = "melee";
    else if (hasRanged) damageType = "ranged";
    else if (hasMelee) damageType = "melee";
    else if (hasMagicSignal) damageType = "magic";
  } else if (hasRanged && !hasMelee && damageType === "melee") {
    damageType = "ranged";
  } else if (hasMelee && !hasRanged && damageType === "ranged") {
    damageType = "melee";
  }

  return damageType;
}

export interface BuildActiveSkillCtx {
  /** mainSkillId → spellGroupId map (resolves school of magic). */
  mainSkillSpellGroupById: Map<string, string | null>;
  /** skillId → mainSkillId з character.skillTreeProgress. */
  skillIdToMainSkill: Record<string, string>;
  /** skillId → SkillLevel з character.skillTreeProgress. */
  skillIdToLevel: Record<string, SkillLevel>;
}

/**
 * Будує повну ActiveSkill із Prisma row + контексту.
 */
export function buildActiveSkillFromRow(
  skill: Prisma.SkillGetPayload<object>,
  skillId: string,
  ctx: BuildActiveSkillCtx,
): ActiveSkill {
  const combatStats = safeParseOrDefault(
    skillCombatStatsSchema,
    skill.combatStats,
    {} as CombatStatsEffects,
    { source: "Skill.combatStats", skillId: skill.id },
  ) as CombatStatsEffects;

  const effects = parseSkillEffects(
    combatStats,
    skill.bonuses as Record<string, unknown> | null,
  );

  const spellEnhancements = extractSpellEnhancements(skill);

  const skillTriggersValue = (skill as Record<string, unknown>).skillTriggers;

  const skillTriggers: SkillTriggers | undefined =
    skillTriggersValue && Array.isArray(skillTriggersValue)
      ? (skillTriggersValue as SkillTriggers)
      : undefined;

  const resolvedSpellGroupId =
    skill.spellGroupId ??
    (skill.mainSkillId
      ? (ctx.mainSkillSpellGroupById.get(skill.mainSkillId) ?? null)
      : null);

  const resolvedDamageType = inferDamageType(combatStats, effects, {
    spellEffectIncrease: skill.spellEffectIncrease,
    enhancementTypes: (skill.spellEnhancementTypes as string[]) || [],
    spellTargetChange: skill.spellTargetChange,
    spellAdditionalModifier: skill.spellAdditionalModifier,
    spellGroupId: resolvedSpellGroupId,
  });

  const resolvedLevel =
    (inferLevelFromSkillName(skill.name) as SkillLevel | null) ??
    ctx.skillIdToLevel[skillId] ??
    SkillLevel.BASIC;

  return {
    skillId: skill.id,
    name: skill.name,
    mainSkillId: skill.mainSkillId ?? ctx.skillIdToMainSkill[skillId] ?? "",
    level: resolvedLevel,
    icon: skill.icon ?? undefined,
    description: skill.description ?? undefined,
    effects,
    affectsDamage: combatStats.affectsDamage,
    damageType: resolvedDamageType,
    linkedSpellId: skill.spellId ?? undefined,
    spellGroupId: resolvedSpellGroupId,
    spellEnhancements,
    skillTriggers,
  };
}

/**
 * Stub-ActiveSkill для skillId, якого нема у БД (orphan / стара referencing).
 */
export function buildUnknownActiveSkill(
  skillId: string,
  ctx: BuildActiveSkillCtx,
): ActiveSkill {
  return {
    skillId,
    name: `Unknown Skill (${skillId})`,
    mainSkillId: ctx.skillIdToMainSkill[skillId],
    level: ctx.skillIdToLevel[skillId],
    effects: [],
    spellEnhancements: undefined,
  };
}
