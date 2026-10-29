import type { FieldMeta } from "./fields";

import { AttackType } from "@/lib/constants/battle";
import { eventActorId, eventAttackKind, eventTargetIds } from "@/lib/utils/abilities/engine/core/events";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import { countMarks, markKey } from "@/lib/utils/abilities/engine/effects/marks";
import type { Condition, ConditionSubject } from "@/lib/utils/abilities/schema";
import { seg, type Segment } from "@/lib/utils/abilities/segments";
import { armorWornMatches } from "@/lib/utils/artifacts/worn-armor";
import { isAdjacent } from "@/lib/utils/battle/grid/occupancy";
import { findEffectMarker } from "@/lib/utils/battle/participant/state";
import { hpRatio } from "@/lib/utils/battle/view/health";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export interface ConditionContext {
  owner: BattleParticipant;
  event: AbilityEvent | null;
  participants: BattleParticipant[];
  sourceId?: string;
}

const WHO: FieldMeta = {
  name: "who",
  input: "select",
  options: [
    { value: "self" },
    { value: "eventTarget" },
    { value: "eventActor" },
    { value: "anyAlly" },
    { value: "anyEnemy" },
  ],
};

export const CONDITION_REGISTRY: Record<Condition["type"], { fields: readonly FieldMeta[] }> = {
  hpBelow: { fields: [WHO, { name: "percent", input: "number" }] },
  hpAbove: { fields: [WHO, { name: "percent", input: "number" }] },
  attackKind: { fields: [{ name: "kind", input: "select", options: [{ value: AttackType.MELEE }, { value: AttackType.RANGED }, { value: "magic" }] }] },
  targetHasCondition: { fields: [{ name: "condition", input: "text" }] },
  targetCreatureType: { fields: [{ name: "types", input: "strings" }] },
  targetRace: { fields: [{ name: "races", input: "strings" }] },
  targetDead: { fields: [] },
  actorIsEnemy: { fields: [] },
  hasMark: {
    fields: [WHO, { name: "markId", input: "text" }, { name: "bySelf", input: "toggle", optional: true }],
  },
  armorWorn: {
    fields: [
      { name: "categories", input: "multiselect", options: [{ value: "none" }, { value: "light" }, { value: "medium" }, { value: "heavy" }] },
      { name: "shield", input: "select", optional: true, options: [{ value: "with" }, { value: "without" }] },
    ],
  },
  attackRollMode: {
    fields: [{ name: "mode", input: "select", options: [{ value: "advantage" }, { value: "disadvantage" }, { value: "normal" }] }],
  },
  allyAdjacent: { fields: [] },
  notMoved: { fields: [] },
  withThisItem: { fields: [] },
  not: { fields: [{ name: "condition", input: "effects" }] },
  all: { fields: [{ name: "conditions", input: "effects" }] },
  any: { fields: [{ name: "conditions", input: "effects" }] },
};

const listParam = (items: readonly string[]) => items.join(", ");

export function describeCondition(c: Condition): Segment[] {
  const who = (w: ConditionSubject) => seg(`summary.conditions.who.${w}`);

  switch (c.type) {
    case "hpBelow":
    case "hpAbove":
      return [seg(`summary.conditions.${c.type}`, { who: who(c.who), percent: c.percent })];
    case "attackKind":
      return [seg("summary.conditions.attackKind", { kind: seg(`summary.conditions.attackKinds.${c.kind}`) })];
    case "targetHasCondition":
      return [seg("summary.conditions.targetHasCondition", { condition: c.condition })];
    case "targetCreatureType":
      return [seg("summary.conditions.targetCreatureType", { types: listParam(c.types) })];
    case "targetRace":
      return [seg("summary.conditions.targetRace", { races: listParam(c.races) })];
    case "hasMark":
      return [seg("summary.conditions.hasMark", { who: who(c.who), markId: c.markId, bySelf: c.bySelf ? "yes" : "no" })];
    case "armorWorn":
      return [
        seg("summary.conditions.armorWorn", {
          categories: { join: ", ", items: c.categories.map((k) => seg(`summary.conditions.armorKinds.${k}`)) },
          shield: c.shield ?? "any",
        }),
      ];
    case "attackRollMode":
      return [seg("summary.conditions.attackRollMode", { mode: seg(`summary.conditions.rollModes.${c.mode}`) })];
    case "not":
      return [seg("summary.conditions.not", { condition: describeCondition(c.condition) })];
    case "all":
    case "any":
      return [seg(`summary.conditions.${c.type}`, { items: c.conditions.flatMap(describeCondition) })];
    default:
      return [seg(`summary.conditions.${c.type}`)];
  }
}

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

function eventRollModeOf(e: AbilityEvent | null): "advantage" | "disadvantage" | "normal" | null {
  if (!e || (e.type !== "attack" && e.type !== "hit")) return null;

  return e.rollMode ?? "normal";
}

function allyNextToTarget({ owner, event, participants }: ConditionContext): boolean {
  const target = event ? eventTargetIds(event).map((id) => findParticipant(participants, id)).find((p) => !!p) : undefined;

  if (!target) return false;

  return participants.some((p) => p.basicInfo.id !== owner.basicInfo.id && p.basicInfo.side === owner.basicInfo.side && isActive(p) && isAdjacent(p, target));
}

export function evaluateCondition(c: Condition, ctx: ConditionContext): boolean {
  switch (c.type) {
    case "hpBelow":
      return subjects(c.who, ctx).some((p) => hpPercent(p) <= c.percent);
    case "hpAbove":
      return subjects(c.who, ctx).some((p) => hpPercent(p) >= c.percent);
    case "attackKind":
      return eventAttackKind(ctx.event) === c.kind;
    case "targetHasCondition":
      return subjects("eventTarget", ctx).some((p) => findEffectMarker(p, c.condition) !== undefined);
    case "targetCreatureType":
      return subjects("eventTarget", ctx).some((p) => !!p.abilities.creatureType && c.types.some((type) => type.trim().toLowerCase() === p.abilities.creatureType?.trim().toLowerCase()));
    case "targetRace":
      return subjects("eventTarget", ctx).some((p) => c.races.some((r) => r.trim().toLowerCase() === p.abilities.race.trim().toLowerCase()));
    case "targetDead":
      return subjects("eventTarget", ctx).some((p) => !isActive(p));
    case "actorIsEnemy":
      return subjects("eventActor", ctx).some((p) => p.basicInfo.side !== ctx.owner.basicInfo.side);
    case "hasMark":
      return subjects(c.who, ctx).some((p) => (c.bySelf ? countMarks(p, c.markId, ctx.owner.basicInfo.id) > 0 : p.battleData.activeEffects.some((e) => e.abilityKey === markKey(c.markId))));
    case "armorWorn":
      return armorWornMatches(ctx.owner, c);
    case "attackRollMode":
      return eventRollModeOf(ctx.event) === c.mode;
    case "allyAdjacent":
      return allyNextToTarget(ctx);
    case "notMoved":
      return !ctx.owner.battleData.movementUsed;
    case "withThisItem": {
      const e = ctx.event;

      return !!ctx.sourceId && !!e && (e.type === "attack" || e.type === "hit") && e.actorId === ctx.owner.basicInfo.id && e.attackSourceId === ctx.sourceId;
    }
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

export function conditionRequiresStill(c?: Condition): boolean {
  if (!c) return false;

  if (c.type === "notMoved") return true;

  return c.type === "all" && c.conditions.some(conditionRequiresStill);
}

export function hasCreatureTypeCondition(c: Condition | undefined): boolean {
  if (!c) return false;

  if (c.type === "targetCreatureType") return true;

  if (c.type === "not") return hasCreatureTypeCondition(c.condition);

  return (c.type === "all" || c.type === "any") && c.conditions.some(hasCreatureTypeCondition);
}

export function conditionEventForTarget(event: AbilityEvent, targetId: string): AbilityEvent {
  if ("targetIds" in event) return { ...event, targetIds: [targetId] };

  if ("targetId" in event) return { ...event, targetId };

  return { type: "spellCast", phase: "after", actorId: eventActorId(event) ?? "", targetIds: [targetId] };
}
