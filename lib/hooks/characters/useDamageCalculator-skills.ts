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
      effects: string;
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

      let effects = "";

      if (s?.combatStats?.effects?.length) {
        effects = (s.combatStats as { effects: Array<{ stat?: string; type?: string; value?: unknown }> }).effects
          .map(
            (e) =>
              `${e.stat ?? "?"}: ${String(e.value ?? "")}${e.type === "percent" ? "%" : ""}`,
          )
          .join("; ");
      } else if (s?.bonuses && Object.keys(s.bonuses).length > 0) {
        effects = Object.entries(s.bonuses)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ");
      }

      return {
        id: s?.id ?? unlockedId,
        unlockedId,
        name,
        affectsDamage,
        damageType,
        effects,
      };
    });

    list.sort((a, b) => a.name.localeCompare(b.name));
    console.info("[Калькулятор шкоди] Всі прокачані скіли героя:", list);
  }, [unlockedSkillIds, skillsList]);

  useEffect(() => {
    if (skillsAffectingDamage.length === 0) return;

    const byType = {
      melee: skillsAffectingDamage.filter(
        (s) => !s.damageType || s.damageType === "melee",
      ),
      ranged: skillsAffectingDamage.filter(
        (s) => !s.damageType || s.damageType === "ranged",
      ),
      magic: skillsAffectingDamage.filter(
        (s) => !s.damageType || s.damageType === "magic",
      ),
    };

    console.info(
      "[Калькулятор шкоди] Навички, що враховуються для героя при розрахунку:",
      {
        всі_з_приміткою_affectsDamage: skillsAffectingDamage.map((s) => ({
          name: s.name,
          damageType: s.damageType ?? "усі",
        })),
        для_ближнього_бою: byType.melee.map((s) => s.name),
        для_дальнього_бою: byType.ranged.map((s) => s.name),
        для_магії: byType.magic.map((s) => s.name),
      },
    );
  }, [skillsAffectingDamage]);

  return {
    unlockedSkillIds,
    resolvedSkillIds,
    skillsAffectingDamage,
  };
}
