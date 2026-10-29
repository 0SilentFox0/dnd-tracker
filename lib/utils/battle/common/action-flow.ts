import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { AbilityRunContext, AbilityRunResult, SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleAction, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

/** Стан однієї дії (атака, закляття): свіжий список учасників і накопичений лог умінь. */
export interface ActionFlow {
  ps: BattleParticipant[];
  messages: LogLine[];
  summons: SummonRequest[];
  ctx: AbilityRunContext;
}

export function getP(flow: ActionFlow, id: string): BattleParticipant {
  const p = findParticipant(flow.ps, id);

  if (!p) throw new Error(`participant ${id} missing from action flow`);

  return p;
}

export function put(flow: ActionFlow, p: BattleParticipant): void {
  flow.ps = replaceParticipant(flow.ps, p);
}

export function fire(flow: ActionFlow, event: AbilityEvent): AbilityRunResult {
  const r = runAbilities(flow.ps, event, flow.ctx);

  flow.ps = r.participants;
  flow.messages.push(...r.messages);
  flow.summons.push(...r.summons);

  return r;
}

export function applyFlowDamage(flow: ActionFlow, before: BattleParticipant, amount: number, crit?: boolean): void {
  const { rules } = flow.ctx;

  if (!rules || amount <= 0 || !(rules.deathSaves.enabled || rules.concentration.enabled || before.battleData.transform)) return;

  const r = applyDamageConsequences({ before, after: getP(flow, before.basicInfo.id), amount, crit, rules: flow.ctx.rules, rng: flow.ctx.rng, participants: flow.ps });

  flow.ps = r.participants;
  flow.messages.push(...r.messages);
}

/** Летальна шкода й вбивство для учасника, що щойно впав. */
export function settleDowned(flow: ActionFlow, victimId: string, actorId: string | null): void {
  const victim = findParticipant(flow.ps, victimId);

  if (!victim || isActive(victim)) return;

  const r = resolveDowned(flow.ps, { victimId, actorId }, flow.ctx);

  flow.ps = r.participants;
  flow.messages.push(...r.messages);
  flow.summons.push(...r.summons);
}

/** Дописує в дію зміни HP, які зробили вміння іншим учасникам. */
export function appendHpChanges(action: BattleAction, before: BattleParticipant[], after: BattleParticipant[]): void {
  const listed = new Set(action.hpChanges.map((c) => c.participantId));

  for (const p of after) {
    const prev = findParticipant(before, p.basicInfo.id);

    if (!prev || listed.has(p.basicInfo.id) || prev.combatStats.currentHp === p.combatStats.currentHp) continue;

    action.hpChanges.push({
      participantId: p.basicInfo.id,
      participantName: p.basicInfo.name,
      oldHp: prev.combatStats.currentHp,
      newHp: p.combatStats.currentHp,
      change: prev.combatStats.currentHp - p.combatStats.currentHp,
    });
  }
}
