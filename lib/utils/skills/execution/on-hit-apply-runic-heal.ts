/**
 * Застосування runic_attack та blood_sacrifice_heal onHit
 */

import { RUNIC_ATTACK_RUNES } from "../types/execution";
import type { OnHitContext } from "./on-hit-context";

import { addActiveEffect } from "@/lib/utils/battle/battle-effects";
import type { SkillEffect } from "@/types/battle";

export function applyRunicAttackOnHit(ctx: OnHitContext): void {
  const runeIdx = Math.floor(Math.random() * RUNIC_ATTACK_RUNES.length);

  const rune = RUNIC_ATTACK_RUNES[runeIdx];

  const dur = 1;

  if (rune.type === "initiative") {
    const ne = addActiveEffect(
      ctx.updatedAttacker,
      {
        id: `skill-${ctx.skill.skillId}-runic-init-${Date.now()}`,
        name: `${ctx.skill.name} — ${rune.label}`,
        type: "buff",
        icon: ctx.skill.icon ?? undefined,
        duration: dur,
        effects: [{ type: "initiative_bonus", value: rune.value }],
      },
      ctx.currentRound,
    );

    ctx.updatedAttacker = {
      ...ctx.updatedAttacker,
      battleData: { ...ctx.updatedAttacker.battleData, activeEffects: ne },
    };
    ctx.set(ctx.updatedAttacker);
  } else if (rune.type === "armor") {
    const ne = addActiveEffect(
      ctx.updatedAttacker,
      {
        id: `skill-${ctx.skill.skillId}-runic-ac-${Date.now()}`,
        name: `${ctx.skill.name} — ${rune.label}`,
        type: "buff",
        icon: ctx.skill.icon ?? undefined,
        duration: dur,
        effects: [{ type: "ac_bonus", value: rune.value }],
      },
      ctx.currentRound,
    );

    ctx.updatedAttacker = {
      ...ctx.updatedAttacker,
      battleData: { ...ctx.updatedAttacker.battleData, activeEffects: ne },
    };
    ctx.set(ctx.updatedAttacker);
  } else if (rune.type === "heal") {
    const newHp = Math.min(
      ctx.updatedAttacker.combatStats.maxHp,
      ctx.updatedAttacker.combatStats.currentHp + rune.value,
    );

    ctx.updatedAttacker = {
      ...ctx.updatedAttacker,
      combatStats: { ...ctx.updatedAttacker.combatStats, currentHp: newHp },
    };
    ctx.set(ctx.updatedAttacker);
  } else {
    ctx.updatedAttacker = {
      ...ctx.updatedAttacker,
      combatStats: {
        ...ctx.updatedAttacker.combatStats,
        morale: ctx.updatedAttacker.combatStats.morale + rune.value,
      },
    };
    ctx.set(ctx.updatedAttacker);
  }

  ctx.messages.push(
    `🔮 ${ctx.skill.name}: ${ctx.attacker.basicInfo.name} — ${rune.label}`,
  );
}

export function applyBloodSacrificeHealOnHit(ctx: OnHitContext, effect: SkillEffect): void {
  if (ctx.physicalDamageDealt == null || ctx.physicalDamageDealt <= 0) return;

  const numValue = typeof effect.value === "number" ? effect.value : 0;

  const percent = effect.isPercentage
    ? numValue
    : typeof effect.value === "number"
      ? effect.value
      : 50;

  const healAmount = Math.floor(ctx.physicalDamageDealt * (percent / 100));

  if (healAmount > 0) {
    const newHp = Math.min(
      ctx.updatedAttacker.combatStats.maxHp,
      ctx.updatedAttacker.combatStats.currentHp + healAmount,
    );

    ctx.updatedAttacker = {
      ...ctx.updatedAttacker,
      combatStats: {
        ...ctx.updatedAttacker.combatStats,
        currentHp: newHp,
      },
    };
    ctx.set(ctx.updatedAttacker);
    ctx.messages.push(
      `🩸 ${ctx.skill.name}: ${ctx.attacker.basicInfo.name} лікується на ${healAmount} HP (${percent}% від шкоди)`,
    );
  }
}
