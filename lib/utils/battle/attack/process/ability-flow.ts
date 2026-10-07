import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/participants";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { AbilityRunContext, AbilityRunResult } from "@/lib/utils/abilities/engine/types";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleAction, BattleParticipant } from "@/types/battle";

/** Стан однієї атаки: свіжий список учасників і накопичений лог умінь. */
export interface AttackFlow {
  ps: BattleParticipant[];
  messages: string[];
  ctx: AbilityRunContext;
}

export function getP(flow: AttackFlow, id: string): BattleParticipant {
  const p = findParticipant(flow.ps, id);

  if (!p) throw new Error(`participant ${id} missing from attack flow`);

  return p;
}

export function put(flow: AttackFlow, p: BattleParticipant): void {
  flow.ps = replaceParticipant(flow.ps, p);
}

export function fire(flow: AttackFlow, event: AbilityEvent): AbilityRunResult {
  const r = runAbilities(flow.ps, event, flow.ctx);

  flow.ps = r.participants;
  flow.messages.push(...r.messages);

  return r;
}

/** Летальна шкода й вбивство для учасника, що щойно впав. */
export function settleDowned(flow: AttackFlow, victimId: string, actorId: string | null): void {
  const victim = findParticipant(flow.ps, victimId);

  if (!victim || isActive(victim)) return;

  const r = resolveDowned(flow.ps, { victimId, actorId }, flow.ctx);

  flow.ps = r.participants;
  flow.messages.push(...r.messages);
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
