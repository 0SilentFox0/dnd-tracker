/**
 * Розрахунок бонусів урону зі скілів (percent, flat, breakdown).
 *
 * Підтримує всі види шкоди (`SkillDamageType`): melee, ranged, magic.
 * Magic-виклики додатково можуть передати `spellGroupId` цілі — тоді
 * скіли, прив'язані до іншої школи магії, не застосовуються
 * (school scope фільтр реалізований у `skill-resolve.getSkillsForDamageBonus`).
 */

import { matchesAttackType } from "../common";
import { getSkillsForDamageBonus } from "./skill-resolve";

import { AttackType } from "@/lib/constants/battle";
import type {
  ActiveSkill,
  BattleParticipant,
  SkillDamageType,
} from "@/types/battle";

export interface SkillDamageBonusContext {
  /** ID групи (школи) заклинання — релевантно лише для magic. */
  spellGroupId?: string | null;
}

/**
 * Один matched ефект: походить або зі скіла, або з активного ефекту на полі.
 * Спільна точка ітерації для всіх агрегацій (sum / breakdown entries).
 */
interface MatchedEffect {
  source: "skill" | "activeEffect";
  /** Заданий лише для `source === "skill"`. */
  skill?: ActiveSkill;
  isPercentage: boolean;
  value: number;
}

/**
 * Спільна ітерація matching-ефектів для даного виду шкоди.
 *
 * Іде:
 *  1) по скілам (`getSkillsForDamageBonus` уже фільтрує highest-level + school scope),
 *  2) по активним ефектам на полі (бафи/дебафи).
 * Викликає `visit` лише для ненульових значень, що метчаться `matchesAttackType`.
 */
function iterateMatchingEffects(
  attacker: BattleParticipant,
  kind: SkillDamageType,
  ctx: SkillDamageBonusContext | undefined,
  visit: (e: MatchedEffect) => void,
): void {
  const skills = getSkillsForDamageBonus(attacker, kind, ctx);

  for (const skill of skills) {
    for (const effect of skill.effects) {
      const value =
        typeof effect.value === "number"
          ? effect.value
          : parseInt(String(effect.value ?? 0), 10) || 0;

      if (value === 0) continue;

      if (!matchesAttackType(effect.stat, kind)) continue;

      visit({
        source: "skill",
        skill,
        isPercentage: effect.isPercentage === true,
        value,
      });
    }
  }

  for (const ae of attacker.battleData.activeEffects) {
    for (const d of ae.effects) {
      const value = typeof d.value === "number" ? d.value : 0;

      if (value === 0) continue;

      if (!matchesAttackType(d.type ?? "", kind)) continue;

      visit({
        source: "activeEffect",
        isPercentage: d.isPercentage === true,
        value,
      });
    }
  }
}

export function calculateSkillDamagePercentBonus(
  attacker: BattleParticipant,
  attackType: AttackType | SkillDamageType,
  ctx?: SkillDamageBonusContext,
): number {
  let total = 0;

  iterateMatchingEffects(attacker, attackType as SkillDamageType, ctx, (e) => {
    if (e.isPercentage) total += e.value;
  });

  return total;
}

export function calculateSkillDamageFlatBonus(
  attacker: BattleParticipant,
  attackType: AttackType | SkillDamageType,
  ctx?: SkillDamageBonusContext,
): number {
  let total = 0;

  iterateMatchingEffects(attacker, attackType as SkillDamageType, ctx, (e) => {
    if (!e.isPercentage) total += e.value;
  });

  return total;
}

/**
 * Breakdown entries — лише per-skill (не зливаємо активні ефекти у "Скіл" рядок).
 * Сумуємо value по кожному скілу, відкидаємо нульові.
 */
function aggregateSkillBreakdown(
  attacker: BattleParticipant,
  kind: SkillDamageType,
  ctx: SkillDamageBonusContext | undefined,
  wantPercent: boolean,
): Map<ActiveSkill, number> {
  const perSkill = new Map<ActiveSkill, number>();

  iterateMatchingEffects(attacker, kind, ctx, (e) => {
    if (e.source !== "skill" || !e.skill) return;

    if (e.isPercentage !== wantPercent) return;

    perSkill.set(e.skill, (perSkill.get(e.skill) ?? 0) + e.value);
  });

  return perSkill;
}

export function getSkillDamagePercentBreakdownEntries(
  attacker: BattleParticipant,
  attackType: AttackType | SkillDamageType,
  ctx?: SkillDamageBonusContext,
): Array<{ name: string; percent: number }> {
  const perSkill = aggregateSkillBreakdown(
    attacker,
    attackType as SkillDamageType,
    ctx,
    true,
  );

  const entries: Array<{ name: string; percent: number }> = [];

  for (const [skill, percent] of perSkill) {
    if (percent !== 0) entries.push({ name: skill.name || "Скіл", percent });
  }

  return entries;
}

export function getSkillDamageFlatBreakdownEntries(
  attacker: BattleParticipant,
  attackType: AttackType | SkillDamageType,
  ctx?: SkillDamageBonusContext,
): Array<{ name: string; flat: number }> {
  const perSkill = aggregateSkillBreakdown(
    attacker,
    attackType as SkillDamageType,
    ctx,
    false,
  );

  const entries: Array<{ name: string; flat: number }> = [];

  for (const [skill, flat] of perSkill) {
    if (flat !== 0) entries.push({ name: skill.name || "Скіл", flat });
  }

  return entries;
}
