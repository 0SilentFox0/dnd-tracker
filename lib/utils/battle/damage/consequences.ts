import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { concentrationBroken, concentrationCheck, dropConcentration, hasConcentration } from "@/lib/utils/battle/concentration";
import { clearDeathSaves, deathSaveDamage, startDying } from "@/lib/utils/battle/death-saves";
import { revertOnZero } from "@/lib/utils/battle/transform/revert";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface DamageConsequencesInput {
  before: BattleParticipant;
  after: BattleParticipant;
  /** шкода після опорів, до обрізання на 0 */
  amount: number;
  crit?: boolean;
  rules?: Ruleset;
  rng: () => number;
  participants: BattleParticipant[];
}

export interface DamageConsequencesResult {
  participant: BattleParticipant;
  participants: BattleParticipant[];
  messages: LogLine[];
}

function unitDiesAtZero(after: BattleParticipant, rules: Ruleset): BattleParticipant {
  const isUnit = after.basicInfo.sourceType === ParticipantSourceType.UNIT;

  if (!rules.deathSaves.enabled || !rules.deathSaves.unitsDieAtZero || !isUnit) return after;

  if (after.combatStats.currentHp > 0 || after.combatStats.status === CombatStatus.DEAD) return after;

  return { ...after, combatStats: { ...after.combatStats, status: CombatStatus.DEAD } };
}

function heroGoesDown(input: DamageConsequencesInput, rules: Ruleset): { participant: BattleParticipant; messages: LogLine[] } {
  const { before, after, amount, crit } = input;

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

function concentrationFallout(input: DamageConsequencesInput, participant: BattleParticipant, rules: Ruleset): { participant: BattleParticipant; participants: BattleParticipant[]; messages: LogLine[] } | null {
  if ((!rules.concentration.enabled && !participant.battleData.pendingCast) || input.amount <= 0 || !hasConcentration(participant)) return null;

  const r = concentrationCheck({ caster: participant, damage: input.amount, participants: input.participants, rules, rng: input.rng });

  return { participant: findParticipant(r.participants, participant.basicInfo.id) ?? participant, participants: r.participants, messages: r.messages };
}

export function applyDamageConsequences(input: DamageConsequencesInput): DamageConsequencesResult {
  const reverted = revertOnZero(input.before, input.after, input.amount);

  if (reverted) {
    const note = textRef("battleLog.transform.formLost", { name: input.after.basicInfo.name, hasOverflow: String(reverted.overflow > 0), overflow: reverted.overflow });

    const inner = applyDamageConsequences({ ...input, before: reverted.before, after: reverted.after, amount: reverted.overflow, participants: replaceParticipant(input.participants, reverted.after) });

    return { ...inner, messages: [note, ...inner.messages] };
  }

  const { after, rules, participants } = input;

  if (!rules) return { participant: after, participants, messages: [] };

  const hero = heroGoesDown(input, rules);

  const downed = unitDiesAtZero(hero.participant, rules);

  const conc = concentrationFallout(input, downed, rules);

  if (conc) return { ...conc, messages: [...hero.messages, ...conc.messages] };

  return {
    participant: downed,
    participants: downed === after ? participants : replaceParticipant(participants, downed),
    messages: hero.messages,
  };
}

/** DM-зміна статусу (HP, воскресіння, вбивство): ті самі наслідки, що й від шкоди. `participants` уже містять `after`. */
export function settleStatusChange(before: BattleParticipant, after: BattleParticipant, participants: BattleParticipant[], rules: Ruleset | undefined): DamageConsequencesResult {
  const none = { participant: after, participants, messages: [] as string[] };

  if (!rules) return none;

  let next = after;

  if (after.combatStats.currentHp > 0 && next.battleData.deathSaves) next = clearDeathSaves(next);

  const isHero = after.basicInfo.sourceType === ParticipantSourceType.CHARACTER;

  const wentDown = before.combatStats.currentHp > 0 && after.combatStats.currentHp <= 0 && after.combatStats.status === CombatStatus.UNCONSCIOUS;

  if (rules.deathSaves.enabled && isHero && wentDown && !next.battleData.deathSaves) next = startDying(next, rules);

  let ps = next === after ? participants : replaceParticipant(participants, next);

  const messages: LogLine[] = [];

  if (rules.concentration.enabled && concentrationBroken(next)) {
    const dropped = dropConcentration(ps, next.basicInfo.id, "");

    ps = dropped.participants;
    messages.push(...dropped.messages);
  }

  return { participant: findParticipant(ps, next.basicInfo.id) ?? next, participants: ps, messages };
}
