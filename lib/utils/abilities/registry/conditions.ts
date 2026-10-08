import type { FieldMeta } from "./fields";

import { AttackType } from "@/lib/constants/battle";
import { eventActorId, eventAttackKind, eventTargetIds } from "@/lib/utils/abilities/engine/events";
import { countMarks, markKey } from "@/lib/utils/abilities/engine/marks";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/participants";
import type { Condition, ConditionSubject } from "@/lib/utils/abilities/schema";
import { hpRatio } from "@/lib/utils/battle/view/health";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export interface ConditionContext {
  owner: BattleParticipant;
  event: AbilityEvent | null;
  participants: BattleParticipant[];
}

const WHO: FieldMeta = {
  name: "who",
  label: "Хто",
  input: "select",
  options: [
    { value: "self", label: "я" },
    { value: "eventTarget", label: "ціль події" },
    { value: "eventActor", label: "виконавець події" },
    { value: "anyAlly", label: "будь-який союзник" },
    { value: "anyEnemy", label: "будь-який ворог" },
  ],
};

export const CONDITION_REGISTRY: Record<Condition["type"], { label: string; fields: readonly FieldMeta[] }> = {
  hpBelow: { label: "HP ≤ %", fields: [WHO, { name: "percent", label: "%", input: "number" }] },
  hpAbove: { label: "HP ≥ %", fields: [WHO, { name: "percent", label: "%", input: "number" }] },
  attackKind: { label: "Тип атаки", fields: [{ name: "kind", label: "Тип", input: "select", options: [{ value: AttackType.MELEE, label: "ближня" }, { value: AttackType.RANGED, label: "дальня" }, { value: "magic", label: "магія" }] }] },
  targetHasCondition: { label: "Ціль має стан", fields: [{ name: "condition", label: "Стан", input: "text" }] },
  targetDead: { label: "Ціль мертва", fields: [] },
  actorIsEnemy: { label: "Виконавець події — ворог", fields: [] },
  hasMark: {
    label: "Має мітку",
    fields: [WHO, { name: "markId", label: "Мітка", input: "text" }, { name: "bySelf", label: "Лише моя мітка", input: "toggle", optional: true }],
  },
  not: { label: "НЕ (заперечення)", fields: [{ name: "condition", label: "Умова", input: "effects" }] },
  all: { label: "Усі умови", fields: [{ name: "conditions", label: "Умови", input: "effects" }] },
  any: { label: "Будь-яка умова", fields: [{ name: "conditions", label: "Умови", input: "effects" }] },
};

function subjects(who: ConditionSubject, ctx: ConditionContext): BattleParticipant[] {
  const { owner, event, participants: ps } = ctx;

  const byIds = (ids: string[]) => ids.map((i) => findParticipant(ps, i)).filter((p): p is BattleParticipant => !!p);

  switch (who) {
    case "self":
      return [owner];
    case "eventTarget":
      return event ? byIds(eventTargetIds(event)) : [];
    case "eventActor": {
      const actor = event ? eventActorId(event) : null;

      return actor ? byIds([actor]) : [];
    }
    case "anyAlly":
      return ps.filter((p) => isActive(p) && p.basicInfo.side === owner.basicInfo.side && p.basicInfo.id !== owner.basicInfo.id);
    case "anyEnemy":
      return ps.filter((p) => isActive(p) && p.basicInfo.side !== owner.basicInfo.side);
  }
}

const hpPercent = (p: BattleParticipant) => hpRatio(p) * 100;

export function evaluateCondition(c: Condition, ctx: ConditionContext): boolean {
  switch (c.type) {
    case "hpBelow":
      return subjects(c.who, ctx).some((p) => hpPercent(p) <= c.percent);
    case "hpAbove":
      return subjects(c.who, ctx).some((p) => hpPercent(p) >= c.percent);
    case "attackKind":
      return eventAttackKind(ctx.event) === c.kind;
    case "targetHasCondition":
      return subjects("eventTarget", ctx).some((p) =>
        p.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === c.condition)),
      );
    case "targetDead":
      return subjects("eventTarget", ctx).some((p) => !isActive(p));
    case "actorIsEnemy":
      return subjects("eventActor", ctx).some((p) => p.basicInfo.side !== ctx.owner.basicInfo.side);
    case "hasMark":
      return subjects(c.who, ctx).some((p) => (c.bySelf ? countMarks(p, c.markId, ctx.owner.basicInfo.id) > 0 : p.battleData.activeEffects.some((e) => e.abilityKey === markKey(c.markId))));
    case "not":
      return !evaluateCondition(c.condition, ctx);
    case "all":
      return c.conditions.every((x) => evaluateCondition(x, ctx));
    case "any":
      return c.conditions.some((x) => evaluateCondition(x, ctx));
  }
}

export function conditionRequiresDeadTarget(c?: Condition): boolean {
  if (!c) return false;

  if (c.type === "targetDead") return true;

  if (c.type === "all") return c.conditions.some(conditionRequiresDeadTarget);

  return c.type === "any" && c.conditions.every(conditionRequiresDeadTarget);
}
