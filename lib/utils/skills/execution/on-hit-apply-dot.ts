/**
 * Застосування DOT ефектів onHit (bleed, poison, burn, fire)
 */

import { parseDiceAverage } from "./helpers";
import type { OnHitContext } from "./on-hit-context";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { SkillEffect } from "@/types/battle";

const DOT_STATS = ["bleed_damage", "poison_damage", "burn_damage", "fire_damage"] as const;

export function applyDotOnHit(ctx: OnHitContext, effect: SkillEffect): void {
  if (!DOT_STATS.includes(effect.stat as (typeof DOT_STATS)[number])) return;

  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const dotDmg =
    typeof effect.value === "string" ? parseDiceAverage(effect.value) : numValue;

  const dotDur = effect.duration ?? 1;

  const dmgType = effect.stat.replace("_damage", "");

  const newEffects = addActiveEffect(
    ctx.updatedTarget,
    {
      id: `skill-${ctx.skill.skillId}-${effect.stat}-${Date.now()}`,
      name: `${ctx.skill.name} — ${dmgType}`,
      type: "debuff",
      icon: ctx.skill.icon ?? undefined,
      duration: dotDur,
      effects: [],
      dotDamage: { damagePerRound: dotDmg, damageType: dmgType },
    },
    ctx.currentRound,
  );

  ctx.updatedTarget = {
    ...ctx.updatedTarget,
    battleData: {
      ...ctx.updatedTarget.battleData,
      activeEffects: newEffects,
    },
  };
  ctx.set(ctx.updatedTarget);
  ctx.messages.push(
    `🔥 ${ctx.skill.name}: ${dmgType} ${effect.value} на ${ctx.target.basicInfo.name} (${dotDur} р.)`,
  );
}
