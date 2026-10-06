import type { FieldMeta } from "./fields";

import { eventActorId, eventAttackKind, eventTargetIds } from "@/lib/utils/abilities/engine/events";
import { findParticipant, isUp } from "@/lib/utils/abilities/engine/participants";
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
  attackKind: { label: "Тип атаки", fields: [{ name: "kind", label: "Тип", input: "select", options: [{ value: "melee", label: "ближня" }, { value: "ranged", label: "дальня" }, { value: "magic", label: "магія" }] }] },
  targetHasCondition: { label: "Ціль має стан", fields: [{ name: "condition", label: "Стан", input: "text" }] },
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
      return ps.filter((p) => isUp(p) && p.basicInfo.side === owner.basicInfo.side && p.basicInfo.id !== owner.basicInfo.id);
    case "anyEnemy":
      return ps.filter((p) => isUp(p) && p.basicInfo.side !== owner.basicInfo.side);
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
    case "all":
      return c.conditions.every((x) => evaluateCondition(x, ctx));
    case "any":
      return c.conditions.some((x) => evaluateCondition(x, ctx));
  }
}
