import type { FieldMeta } from "./fields";

import { AttackType } from "@/lib/constants/battle";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { Trigger, TriggerEvent } from "@/lib/utils/abilities/schema";
import { seg, type Segment } from "@/lib/utils/abilities/segments";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

type Matcher<E extends TriggerEvent> = (
  trigger: Extract<Trigger, { event: E }>,
  event: AbilityEvent,
  owner: BattleParticipant,
  ps: BattleParticipant[],
) => boolean;

export type TriggerGroup = "always" | "boundaries" | "myTurn" | "incoming" | "outgoing" | "other";

export const TRIGGER_GROUPS: readonly TriggerGroup[] = ["always", "boundaries", "myTurn", "incoming", "outgoing", "other"];

interface TriggerDefinition<E extends TriggerEvent> {
  event: E;
  group: TriggerGroup;
  fields: readonly FieldMeta[];
  matches: Matcher<E>;
  describe?: (trigger: Extract<Trigger, { event: E }>) => Segment[];
}

const PHASE: FieldMeta = { name: "phase", input: "select", options: [{ value: "before" }, { value: "after" }] };

const ATTACK_KIND: FieldMeta = { name: "attackKind", input: "select", optional: true, options: [{ value: AttackType.MELEE }, { value: AttackType.RANGED }] };

const ATTACK_ROLE: FieldMeta = { name: "role", input: "select", options: [{ value: "attacker" }, { value: "target" }] };

const id = (p: BattleParticipant) => p.basicInfo.id;

const sameSide = (a: BattleParticipant | undefined, b: BattleParticipant) => !!a && a.basicInfo.side === b.basicInfo.side;

export const TRIGGER_REGISTRY: { [E in TriggerEvent]: TriggerDefinition<E> } = {
  passive: { event: "passive", group: "always", fields: [], matches: () => false },
  battleStart: {
    event: "battleStart",
    group: "boundaries",
    fields: [],
    matches: (_t, e, o) => e.type === "battleStart" && (!e.newcomerIds || e.newcomerIds.includes(id(o))),
  },
  roundStart: { event: "roundStart", group: "boundaries", fields: [], matches: (_t, e) => e.type === "roundStart" },
  roundEnd: { event: "roundEnd", group: "boundaries", fields: [], matches: (_t, e) => e.type === "roundEnd" },
  turnStart: { event: "turnStart", group: "myTurn", fields: [], matches: (_t, e, o) => e.type === "turnStart" && e.actorId === id(o) },
  turnEnd: { event: "turnEnd", group: "myTurn", fields: [], matches: (_t, e, o) => e.type === "turnEnd" && e.actorId === id(o) },
  attack: {
    event: "attack",
    group: "incoming",
    fields: [PHASE, ATTACK_ROLE, ATTACK_KIND],
    matches: (t, e, o) =>
      e.type === "attack" &&
      e.phase === t.phase &&
      (!t.attackKind || t.attackKind === e.attackKind) &&
      (t.role === "attacker" ? e.actorId : e.targetId) === id(o),
  },
  hit: {
    event: "hit",
    group: "outgoing",
    fields: [
      ATTACK_ROLE,
      { name: "whose", input: "select", optional: true, options: [{ value: "self" }, { value: "ally" }] },
      ATTACK_KIND,
    ],
    matches: (t, e, o, ps) => {
      if (e.type !== "hit" || (t.attackKind && t.attackKind !== e.attackKind)) return false;

      const subject = t.role === "attacker" ? e.actorId : e.targetId;

      if (t.whose !== "ally") return subject === id(o);

      const other = findParticipant(ps, subject);

      return subject !== id(o) && !!other && isActive(other) && sameSide(other, o);
    },
    describe: (t) => (t.whose === "ally" ? [seg("summary.triggers.otherAlly")] : []),
  },
  kill: {
    event: "kill",
    group: "outgoing",
    fields: [{ name: "role", input: "select", options: [{ value: "killer" }, { value: "killerSide" }, { value: "victimSide" }] }],
    matches: (t, e, o, ps) => {
      if (e.type !== "kill") return false;

      const killer = e.actorId ? findParticipant(ps, e.actorId) : undefined;

      const victim = findParticipant(ps, e.targetId);

      // friendly fire не рахується як вбивство для вбивці та його сторони
      const enemyKilled = !!killer && !!victim && killer.basicInfo.side !== victim.basicInfo.side;

      if (t.role === "killer") return enemyKilled && e.actorId === id(o);

      if (t.role === "killerSide") return enemyKilled && sameSide(killer, o);

      return e.targetId !== id(o) && sameSide(victim, o);
    },
  },
  lethalDamage: { event: "lethalDamage", group: "incoming", fields: [], matches: (_t, e, o) => e.type === "lethalDamage" && e.targetId === id(o) },
  spellCast: {
    event: "spellCast",
    group: "outgoing",
    fields: [
      PHASE,
      { name: "role", input: "select", options: [{ value: "caster" }, { value: "target" }] },
      { name: "whose", input: "select", optional: true, options: [{ value: "self" }, { value: "ally" }], visibleWhen: (v) => v.role === "target" },
      { name: "spellIds", input: "spells", optional: true },
      { name: "school", input: "text", optional: true },
      { name: "spellLevels", input: "numberList", optional: true },
    ],
    matches: (t, e, o, ps) =>
      e.type === "spellCast" &&
      e.phase === t.phase &&
      (t.role === "caster" ? e.actorId === id(o) : spellTargetMatches(t.whose, e.targetIds, o, ps)) &&
      (!t.spellIds || (!!e.spellId && t.spellIds.includes(e.spellId))) &&
      (!t.school || e.school === t.school) &&
      (!t.spellLevels || (e.level !== undefined && t.spellLevels.includes(e.level))),
    describe: (t) => [
      ...(t.spellIds ? [seg("summary.triggers.spellCount", { n: t.spellIds.length })] : []),
      ...(t.school ? [seg("summary.triggers.school", { school: t.school })] : []),
      ...(t.spellLevels ? [seg("summary.triggers.spellLevels", { levels: t.spellLevels.join(", ") })] : []),
    ],
  },
  moraleCheck: {
    event: "moraleCheck",
    group: "other",
    fields: [
      { name: "result", input: "select", options: [{ value: "success" }, { value: "fail" }, { value: "any" }] },
      { name: "whose", input: "select", options: [{ value: "self" }, { value: "ally" }] },
    ],
    matches: (t, e, o, ps) => {
      if (e.type !== "moraleCheck" || (t.result !== "any" && t.result !== e.result)) return false;

      return t.whose === "self" ? e.actorId === id(o) : e.actorId !== id(o) && sameSide(findParticipant(ps, e.actorId), o);
    },
  },
  action: { event: "action", group: "myTurn", fields: [], matches: (_t, e, o) => e.type === "action" && e.actorId === id(o) },
  bonusAction: { event: "bonusAction", group: "myTurn", fields: [], matches: (_t, e, o) => e.type === "bonusAction" && e.actorId === id(o) },
};

function spellTargetMatches(whose: "self" | "ally" | undefined, targetIds: string[], owner: BattleParticipant, ps: BattleParticipant[]): boolean {
  if (whose !== "ally") return targetIds.includes(id(owner));

  return targetIds.some((tid) => {
    const other = findParticipant(ps, tid);

    return tid !== id(owner) && !!other && isActive(other) && sameSide(other, owner);
  });
}

export const TRIGGERS_BY_GROUP: Record<TriggerGroup, TriggerEvent[]> = Object.fromEntries(
  TRIGGER_GROUPS.map((g) => [g, Object.values(TRIGGER_REGISTRY).filter((d) => d.group === g).map((d) => d.event)]),
) as Record<TriggerGroup, TriggerEvent[]>;

export function describeTrigger(trigger: Trigger): Segment[] {
  const def = TRIGGER_REGISTRY[trigger.event] as TriggerDefinition<TriggerEvent>;

  return [seg(`triggers.${trigger.event}.label`), ...(def.describe?.(trigger as never) ?? [])];
}

export function triggerMatches(trigger: Trigger, event: AbilityEvent, owner: BattleParticipant, ps: BattleParticipant[]): boolean {
  const def = TRIGGER_REGISTRY[trigger.event] as TriggerDefinition<TriggerEvent>;

  return def.matches(trigger as never, event, owner, ps);
}
