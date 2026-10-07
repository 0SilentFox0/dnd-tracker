import type { FieldMeta } from "./fields";

import { AttackType } from "@/lib/constants/battle";
import { findParticipant } from "@/lib/utils/abilities/engine/participants";
import type { Trigger, TriggerEvent } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

type Matcher<E extends TriggerEvent> = (
  trigger: Extract<Trigger, { event: E }>,
  event: AbilityEvent,
  owner: BattleParticipant,
  ps: BattleParticipant[],
) => boolean;

interface TriggerDefinition<E extends TriggerEvent> {
  event: E;
  label: string;
  fields: readonly FieldMeta[];
  matches: Matcher<E>;
  describe?: (trigger: Extract<Trigger, { event: E }>) => string[];
}

const PHASE: FieldMeta = { name: "phase", label: "Фаза", input: "select", options: [{ value: "before", label: "до" }, { value: "after", label: "після" }] };

const ATTACK_KIND: FieldMeta = { name: "attackKind", label: "Тип атаки", input: "select", optional: true, options: [{ value: AttackType.MELEE, label: "ближня" }, { value: AttackType.RANGED, label: "дальня" }] };

const ATTACK_ROLE: FieldMeta = { name: "role", label: "Роль", input: "select", options: [{ value: "attacker", label: "атакую я" }, { value: "target", label: "атакують мене" }] };

const id = (p: BattleParticipant) => p.basicInfo.id;

const sameSide = (a: BattleParticipant | undefined, b: BattleParticipant) => !!a && a.basicInfo.side === b.basicInfo.side;

export const TRIGGER_REGISTRY: { [E in TriggerEvent]: TriggerDefinition<E> } = {
  passive: { event: "passive", label: "Пасивно (завжди)", fields: [], matches: () => false },
  battleStart: {
    event: "battleStart",
    label: "Початок бою",
    fields: [],
    matches: (_t, e, o) => e.type === "battleStart" && (!e.newcomerIds || e.newcomerIds.includes(id(o))),
  },
  roundStart: { event: "roundStart", label: "Початок раунду", fields: [], matches: (_t, e) => e.type === "roundStart" },
  roundEnd: { event: "roundEnd", label: "Кінець раунду", fields: [], matches: (_t, e) => e.type === "roundEnd" },
  turnStart: { event: "turnStart", label: "Початок мого ходу", fields: [], matches: (_t, e, o) => e.type === "turnStart" && e.actorId === id(o) },
  turnEnd: { event: "turnEnd", label: "Кінець мого ходу", fields: [], matches: (_t, e, o) => e.type === "turnEnd" && e.actorId === id(o) },
  attack: {
    event: "attack",
    label: "Атака",
    fields: [PHASE, ATTACK_ROLE, ATTACK_KIND],
    matches: (t, e, o) =>
      e.type === "attack" &&
      e.phase === t.phase &&
      (!t.attackKind || t.attackKind === e.attackKind) &&
      (t.role === "attacker" ? e.actorId : e.targetId) === id(o),
  },
  hit: {
    event: "hit",
    label: "Влучання",
    fields: [ATTACK_ROLE, ATTACK_KIND],
    matches: (t, e, o) =>
      e.type === "hit" && (!t.attackKind || t.attackKind === e.attackKind) && (t.role === "attacker" ? e.actorId : e.targetId) === id(o),
  },
  kill: {
    event: "kill",
    label: "Смерть",
    fields: [{ name: "role", label: "Хто", input: "select", options: [{ value: "killer", label: "я вбив" }, { value: "killerSide", label: "вбив хтось із моїх" }, { value: "victimSide", label: "загинув союзник" }] }],
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
  lethalDamage: { event: "lethalDamage", label: "Летальна шкода", fields: [], matches: (_t, e, o) => e.type === "lethalDamage" && e.targetId === id(o) },
  spellCast: {
    event: "spellCast",
    label: "Заклинання",
    fields: [
      PHASE,
      { name: "role", label: "Роль", input: "select", options: [{ value: "caster", label: "кастую я" }, { value: "target", label: "ціль — я" }] },
      { name: "spellIds", label: "Закляття", input: "spells", optional: true },
      { name: "school", label: "Школа", input: "text", optional: true },
      { name: "spellLevels", label: "Рівні закляття", input: "numberList", optional: true },
    ],
    matches: (t, e, o) =>
      e.type === "spellCast" &&
      e.phase === t.phase &&
      (t.role === "caster" ? e.actorId === id(o) : e.targetIds.includes(id(o))) &&
      (!t.spellIds || (!!e.spellId && t.spellIds.includes(e.spellId))) &&
      (!t.school || e.school === t.school) &&
      (!t.spellLevels || (e.level !== undefined && t.spellLevels.includes(e.level))),
    describe: (t) =>
      [
        t.spellIds && `закляття: ${t.spellIds.length}`,
        t.school && `школа ${t.school}`,
        t.spellLevels && `рівні ${t.spellLevels.join(", ")}`,
      ].filter(Boolean) as string[],
  },
  moraleCheck: {
    event: "moraleCheck",
    label: "Перевірка моралі",
    fields: [
      { name: "result", label: "Результат", input: "select", options: [{ value: "success", label: "успіх" }, { value: "fail", label: "провал" }, { value: "any", label: "будь-який" }] },
      { name: "whose", label: "Чия", input: "select", options: [{ value: "self", label: "моя" }, { value: "ally", label: "союзника" }] },
    ],
    matches: (t, e, o, ps) => {
      if (e.type !== "moraleCheck" || (t.result !== "any" && t.result !== e.result)) return false;

      return t.whose === "self" ? e.actorId === id(o) : e.actorId !== id(o) && sameSide(findParticipant(ps, e.actorId), o);
    },
  },
  action: { event: "action", label: "Основна дія (кнопка)", fields: [], matches: (_t, e, o) => e.type === "action" && e.actorId === id(o) },
  bonusAction: { event: "bonusAction", label: "Бонусна дія (кнопка)", fields: [], matches: (_t, e, o) => e.type === "bonusAction" && e.actorId === id(o) },
};

export function describeTrigger(trigger: Trigger): string[] {
  const def = TRIGGER_REGISTRY[trigger.event] as TriggerDefinition<TriggerEvent>;

  return [def.label, ...(def.describe?.(trigger as never) ?? [])];
}

export function triggerMatches(trigger: Trigger, event: AbilityEvent, owner: BattleParticipant, ps: BattleParticipant[]): boolean {
  const def = TRIGGER_REGISTRY[trigger.event] as TriggerDefinition<TriggerEvent>;

  return def.matches(trigger as never, event, owner, ps);
}
