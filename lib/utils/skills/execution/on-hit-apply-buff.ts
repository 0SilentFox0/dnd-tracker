/**
 * Застосування баф-ефектів onHit (initiative, melee_damage, ranged_damage для цілі або all_allies)
 */

import {
  evaluateFormulaSimple,
  getEffectTargets,
} from "./helpers";
import type { OnHitContext } from "./on-hit-context";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { SkillEffect } from "@/types/battle";

export function applyInitiativeOnHit(ctx: OnHitContext, effect: SkillEffect): void {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const dur = effect.duration ?? 2;

  if (
    effect.target === "all_allies" &&
    ctx.allParticipants &&
    ctx.allParticipants.length > 0
  ) {
    const targets = getEffectTargets(
      ctx.updatedAttacker,
      effect.target,
      Array.from(ctx.byId.values()),
    );

    for (const t of targets) {
      const val =
        effect.type === "formula" && typeof effect.value === "string"
          ? evaluateFormulaSimple(effect.value, t)
          : numValue;

      const ne = addActiveEffect(
        t,
        {
          id: `skill-${ctx.skill.skillId}-initiative-${t.basicInfo.id}-${Date.now()}`,
          name: `${ctx.skill.name} — ініціатива`,
          type: "buff",
          icon: ctx.skill.icon ?? undefined,
          duration: dur,
          effects: [{ type: "initiative_bonus", value: val }],
        },
        ctx.currentRound,
      );

      ctx.set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
    }

    const targetNames = targets.map((t) => t.basicInfo.name).join(", ");

    ctx.messages.push(
      `🏃 ${ctx.skill.name}: ${ctx.updatedAttacker.basicInfo.name} → ${targetNames} +ініціатива (${dur} р.)`,
    );
  } else {
    const ne = addActiveEffect(
      ctx.updatedTarget,
      {
        id: `skill-${ctx.skill.skillId}-initiative-${Date.now()}`,
        name: `${ctx.skill.name} — ініціатива`,
        type: "debuff",
        icon: ctx.skill.icon ?? undefined,
        duration: dur,
        effects: [{ type: "initiative_bonus", value: numValue }],
      },
      ctx.currentRound,
    );

    ctx.updatedTarget = {
      ...ctx.updatedTarget,
      battleData: { ...ctx.updatedTarget.battleData, activeEffects: ne },
    };
    ctx.set(ctx.updatedTarget);
    ctx.messages.push(
      `⚡ ${ctx.skill.name}: ${ctx.target.basicInfo.name} ${numValue} ініціатива (${dur} р.)`,
    );
  }
}

export function applyMeleeRangedDamageOnHit(ctx: OnHitContext, effect: SkillEffect): void {
  const numValue = typeof effect.value === "number" ? effect.value : 0;

  if (
    effect.target === "all_allies" &&
    ctx.allParticipants &&
    ctx.allParticipants.length > 0
  ) {
    const targets = getEffectTargets(
      ctx.updatedAttacker,
      effect.target,
      Array.from(ctx.byId.values()),
    );

    const dur = effect.duration ?? 2;

    for (const t of targets) {
      const val =
        effect.type === "formula" && typeof effect.value === "string"
          ? evaluateFormulaSimple(effect.value, t)
          : numValue;

      const ne = addActiveEffect(
        t,
        {
          id: `skill-${ctx.skill.skillId}-${effect.stat}-${t.basicInfo.id}-${Date.now()}`,
          name: `${ctx.skill.name} — бонус урону`,
          type: "buff",
          icon: ctx.skill.icon ?? undefined,
          duration: dur,
          effects: [{ type: effect.stat, value: val }],
        },
        ctx.currentRound,
      );

      ctx.set({ ...t, battleData: { ...t.battleData, activeEffects: ne } });
    }

    const targetNames = targets.map((t) => t.basicInfo.name).join(", ");

    ctx.messages.push(
      `⚔️ ${ctx.skill.name}: ${ctx.updatedAttacker.basicInfo.name} → ${targetNames} +${effect.stat} (${dur} р.)`,
    );
  }
}
