/**
 * Застосування дебаф-ефектів onHit (armor, speed, armor_reduction)
 */

import type { OnHitContext } from "./on-hit-context";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { SkillEffect } from "@/types/battle";

export function applyArmorOnHit(ctx: OnHitContext, effect: SkillEffect): void {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const dur = effect.duration ?? 1;

  const ne = addActiveEffect(
    ctx.updatedTarget,
    {
      id: `skill-${ctx.skill.skillId}-armor-${Date.now()}`,
      name: `${ctx.skill.name} — AC`,
      type: "debuff",
      icon: ctx.skill.icon ?? undefined,
      duration: dur,
      effects: [{ type: "ac_bonus", value: numValue }],
    },
    ctx.currentRound,
  );

  ctx.updatedTarget = {
    ...ctx.updatedTarget,
    battleData: { ...ctx.updatedTarget.battleData, activeEffects: ne },
    combatStats: {
      ...ctx.updatedTarget.combatStats,
      armorClass: ctx.updatedTarget.combatStats.armorClass + numValue,
    },
  };
  ctx.set(ctx.updatedTarget);
  ctx.messages.push(
    `🛡 ${ctx.skill.name}: ${ctx.target.basicInfo.name} ${numValue} AC (${dur} р.)`,
  );
}

export function applySpeedOnHit(ctx: OnHitContext, effect: SkillEffect): void {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const dur = effect.duration ?? 1;

  const speedRed = effect.isPercentage
    ? Math.floor(ctx.updatedTarget.combatStats.speed * (Math.abs(numValue) / 100))
    : Math.abs(numValue);

  const ne = addActiveEffect(
    ctx.updatedTarget,
    {
      id: `skill-${ctx.skill.skillId}-speed-${Date.now()}`,
      name: `${ctx.skill.name} — швидкість`,
      type: "debuff",
      icon: ctx.skill.icon ?? undefined,
      duration: dur,
      effects: [{ type: "speed_bonus", value: -speedRed }],
    },
    ctx.currentRound,
  );

  ctx.updatedTarget = {
    ...ctx.updatedTarget,
    battleData: { ...ctx.updatedTarget.battleData, activeEffects: ne },
    combatStats: {
      ...ctx.updatedTarget.combatStats,
      speed: Math.max(0, ctx.updatedTarget.combatStats.speed - speedRed),
    },
  };
  ctx.set(ctx.updatedTarget);
  ctx.messages.push(
    `🐌 ${ctx.skill.name}: ${ctx.target.basicInfo.name} −${speedRed} швидкість (${dur} р.)`,
  );
}

export function applyArmorReductionOnHit(ctx: OnHitContext, effect: SkillEffect): void {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const dur = effect.duration ?? 1;

  const armorRed = Math.floor(
    ctx.updatedTarget.combatStats.armorClass * (numValue / 100),
  );

  const ne = addActiveEffect(
    ctx.updatedTarget,
    {
      id: `skill-${ctx.skill.skillId}-armor-red-${Date.now()}`,
      name: `${ctx.skill.name} — −AC`,
      type: "debuff",
      icon: ctx.skill.icon ?? undefined,
      duration: dur,
      effects: [{ type: "ac_bonus", value: -armorRed }],
    },
    ctx.currentRound,
  );

  ctx.updatedTarget = {
    ...ctx.updatedTarget,
    battleData: { ...ctx.updatedTarget.battleData, activeEffects: ne },
    combatStats: {
      ...ctx.updatedTarget.combatStats,
      armorClass: Math.max(0, ctx.updatedTarget.combatStats.armorClass - armorRed),
    },
  };
  ctx.set(ctx.updatedTarget);
  ctx.messages.push(
    `🔨 ${ctx.skill.name}: ${ctx.target.basicInfo.name} −${numValue}% AC (${dur} р.)`,
  );
}
