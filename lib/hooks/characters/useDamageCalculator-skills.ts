/**
 * Логіка скілів для useDamageCalculator: unlockedSkillIds, resolvedSkillIds, skillsAffectingDamage + debug logs.
 */

import { useEffect, useMemo } from "react";

import { resolveUnlockedIdToSkill } from "./useDamageCalculator-helpers";

import type { SkillAffectingDamage } from "@/components/characters/stats/damage-calculator-utils";

function isAffectsDamage(skill: {
  combatStats?: unknown;
  affectsDamage?: unknown;
}): boolean {
  const cs = skill.combatStats as { affectsDamage?: unknown } | undefined;

  const val =
    cs?.affectsDamage ?? (skill as { affectsDamage?: unknown }).affectsDamage;

  if (val === true || val === 1) return true;

  if (typeof val === "string" && val.toLowerCase() === "true") return true;

  return false;
}

export function useDamageCalculatorSkills(
  skillTreeProgress: Record<string, { unlockedSkills?: string[] } | undefined> | undefined,
  skillsList: Array<{
    id: string;
    basicInfo?: { name?: string };
    name?: string;
    combatStats?: { affectsDamage?: unknown; damageType?: string | null; effects?: Array<{ stat?: string; type?: string; value?: unknown }> };
    mainSkillData?: { mainSkillId?: string };
    bonuses?: Record<string, number>;
  }>,
) {
  const unlockedSkillIds = useMemo(() => {
    const ids = new Set<string>();

    if (!skillTreeProgress || typeof skillTreeProgress !== "object") return ids;

    for (const entry of Object.values(skillTreeProgress)) {
      if (!entry || typeof entry !== "object") continue;

      const list = (entry as { unlockedSkills?: unknown }).unlockedSkills;

      if (Array.isArray(list)) {
        for (const id of list) {
          if (typeof id === "string" && id.trim()) ids.add(id.trim());
        }
      }
    }

    return ids;
  }, [skillTreeProgress]);

  const resolvedSkillIds = useMemo(() => {
    const set = new Set<string>();

    for (const unlockedId of unlockedSkillIds) {
      const skill = resolveUnlockedIdToSkill(unlockedId, skillsList);

      if (skill) set.add(skill.id);
    }

    return set;
  }, [unlockedSkillIds, skillsList]);

  const skillsAffectingDamage = useMemo((): SkillAffectingDamage[] => {
    return skillsList
      .filter((s) => {
        if (!resolvedSkillIds.has(s.id)) return false;

        return isAffectsDamage(s);
      })
      .map((s) => ({
        id: s.id,
        name:
          (s.basicInfo as { name?: string } | undefined)?.name ??
          (s as { name?: string }).name ??
          "—",
        damageType: (s.combatStats?.damageType as "melee" | "ranged" | "magic" | null) ?? null,
      }));
  }, [skillsList, resolvedSkillIds]);

  useEffect(() => {
    const ids = Array.from(unlockedSkillIds);

    if (ids.length === 0) {
      console.info(
        "[Калькулятор шкоди] Прокачані скіли героя: немає (unlockedSkillIds порожні)",
      );

      return;
    }

    type SkillItem = {
      id: string;
      unlockedId: string;
      name: string;
      affectsDamage: boolean;
      damageType: string | null;
      effectsArray: Array<{
        stat: string;
        type: string;
        value: unknown;
        isPercentage: boolean;
      }>;
      legacyBonuses: Record<string, number> | null;
      rawCombatStats: unknown;
    };

    const list: SkillItem[] = ids.map((unlockedId) => {
      const s = resolveUnlockedIdToSkill(unlockedId, skillsList) as typeof skillsList[0] | undefined;

      const name =
        (s?.basicInfo as { name?: string } | undefined)?.name ??
        (s as { name?: string } | undefined)?.name ??
        unlockedId;

      const affectsDamage = s ? isAffectsDamage(s) : false;

      const damageType =
        (s?.combatStats?.damageType as string | null) ?? null;

      const rawEffects = (
        s?.combatStats as
          | {
              effects?: Array<{
                stat?: string;
                type?: string;
                value?: unknown;
                isPercentage?: boolean;
              }>;
            }
          | undefined
      )?.effects;

      const effectsArray = Array.isArray(rawEffects)
        ? rawEffects.map((e) => ({
            stat: e.stat ?? "?",
            type: e.type ?? "?",
            value: e.value,
            isPercentage:
              e.isPercentage === true ||
              e.type === "percent" ||
              e.type === "percentage",
          }))
        : [];

      const legacyBonuses =
        s?.bonuses && Object.keys(s.bonuses).length > 0 ? s.bonuses : null;

      return {
        id: s?.id ?? unlockedId,
        unlockedId,
        name,
        affectsDamage,
        damageType,
        effectsArray,
        legacyBonuses,
        rawCombatStats: s?.combatStats ?? null,
      };
    });

    list.sort((a, b) => a.name.localeCompare(b.name));
    console.info("[Калькулятор шкоди] Всі прокачані скіли героя:", list);
  }, [unlockedSkillIds, skillsList]);

  useEffect(() => {
    if (skillsAffectingDamage.length === 0) return;

    // Resolve full effect data per skill для діагностики +X% / +X flat бонусів.
    const skillDetails = skillsAffectingDamage.map((s) => {
      const skill = skillsList.find((sk) => sk.id === s.id) as
        | typeof skillsList[0]
        | undefined;

      const rawEffects = (skill?.combatStats as
        | {
            effects?: Array<{
              stat?: string;
              type?: string;
              value?: unknown;
              isPercentage?: boolean;
            }>;
          }
        | undefined)?.effects;

      const effects = Array.isArray(rawEffects)
        ? rawEffects.map((e) => ({
            stat: e.stat ?? "?",
            type: e.type ?? "?",
            value: e.value,
            isPercentage:
              e.isPercentage === true ||
              e.type === "percent" ||
              e.type === "percentage",
          }))
        : [];

      const legacyBonuses =
        skill?.bonuses && Object.keys(skill.bonuses).length > 0
          ? skill.bonuses
          : null;

      return {
        name: s.name,
        damageType: s.damageType ?? "усі",
        effects,
        legacyBonuses,
      };
    });

    const byType = {
      melee: skillDetails.filter(
        (s) => s.damageType === "усі" || s.damageType === "melee",
      ),
      ranged: skillDetails.filter(
        (s) => s.damageType === "усі" || s.damageType === "ranged",
      ),
      magic: skillDetails.filter(
        (s) => s.damageType === "усі" || s.damageType === "magic",
      ),
    };

    console.info(
      "[Калькулятор шкоди] Навички, що враховуються для героя при розрахунку:",
      {
        всі_з_приміткою_affectsDamage: skillDetails,
        для_ближнього_бою: byType.melee,
        для_дальнього_бою: byType.ranged,
        для_магії: byType.magic,
      },
    );
  }, [skillsAffectingDamage, skillsList]);

  return {
    unlockedSkillIds,
    resolvedSkillIds,
    skillsAffectingDamage,
  };
}
