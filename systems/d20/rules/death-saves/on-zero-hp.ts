import { dropBrokenConcentration } from "../concentration/damaged";
import { startDying } from "./start";

import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { DamageConsequencesResult } from "@/lib/utils/battle/damage/consequences";
import { clearDeathSaves, deathSaveDamage } from "@/lib/utils/battle/death-saves";
import type { ZeroHpCtx } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function unitDiesAtZero(after: BattleParticipant, ctx: Pick<ZeroHpCtx, "rules">): BattleParticipant {
  const { rules } = ctx;

  const isUnit = after.basicInfo.sourceType === ParticipantSourceType.UNIT;

  if (!rules.deathSaves.enabled || !rules.deathSaves.unitsDieAtZero || !isUnit) return after;

  if (after.combatStats.currentHp > 0 || after.combatStats.status === CombatStatus.DEAD) return after;

  return { ...after, combatStats: { ...after.combatStats, status: CombatStatus.DEAD } };
}

export function heroGoesDown(ctx: ZeroHpCtx): { participant: BattleParticipant; messages: LogLine[] } {
  const { before, after, amount, crit, rules } = ctx;

  const none = { participant: after, messages: [] };

  if (!rules.deathSaves.enabled || before.basicInfo.sourceType !== ParticipantSourceType.CHARACTER || amount <= 0) return none;

  if (after.combatStats.status === CombatStatus.DEAD && before.combatStats.currentHp <= 0) return none;

  const instantDeath = (overflow: number, hp: number) =>
    overflow >= before.combatStats.maxHp
      ? { participant: { ...after, combatStats: { ...after.combatStats, currentHp: hp, status: CombatStatus.DEAD } }, messages: [textRef("battleLog.death.massive", { name: after.basicInfo.name })] }
      : null;

  if (before.combatStats.currentHp > 0 && after.combatStats.currentHp <= 0) {
    const dead = instantDeath(amount - before.combatStats.currentHp - before.combatStats.tempHp, 0);

    if (dead) return dead;

    return { participant: startDying(after, rules), messages: [textRef("battleLog.death.unconscious", { name: after.basicInfo.name })] };
  }

  if (before.combatStats.currentHp <= 0 && before.battleData.deathSaves && after.combatStats.status === CombatStatus.UNCONSCIOUS) {
    const killed = instantDeath(amount, after.combatStats.currentHp);

    if (killed) return killed;

    const hit = deathSaveDamage(after, !!crit);

    const dead = hit.combatStats.status === CombatStatus.DEAD;

    return { participant: hit, messages: [textRef(dead ? "battleLog.death.woundsDeath" : "battleLog.death.damageFail", { name: after.basicInfo.name })] };
  }

  return none;
}

function settleManual(ctx: ZeroHpCtx): DamageConsequencesResult {
  const { before, after, participants, rules } = ctx;

  let next = after;

  if (after.combatStats.currentHp > 0 && next.battleData.deathSaves) next = clearDeathSaves(next);

  const isHero = after.basicInfo.sourceType === ParticipantSourceType.CHARACTER;

  const wentDown = before.combatStats.currentHp > 0 && after.combatStats.currentHp <= 0 && after.combatStats.status === CombatStatus.UNCONSCIOUS;

  if (rules.deathSaves.enabled && isHero && wentDown && !next.battleData.deathSaves) next = startDying(next, rules);

  const ps = next === after ? participants : replaceParticipant(participants, next);

  if (!rules.concentration.enabled) return { participant: findParticipant(ps, next.basicInfo.id) ?? next, participants: ps, messages: [] };

  const dropped = dropBrokenConcentration(next, ps);

  return { participant: findParticipant(dropped.participants, next.basicInfo.id) ?? next, participants: dropped.participants, messages: dropped.messages };
}

export function d20OnZeroHp(ctx: ZeroHpCtx): DamageConsequencesResult {
  if (ctx.manual) return settleManual(ctx);

  const hero = heroGoesDown(ctx);

  const downed = unitDiesAtZero(hero.participant, ctx);

  return { participant: downed, participants: downed === ctx.after ? ctx.participants : replaceParticipant(ctx.participants, downed), messages: hero.messages };
}
