import { resolveFlat } from "./amount";
import { legacyActiveEffectModifiers } from "./legacy-active-effects";
import { findParticipant, isActive, resolvedAbilitiesOf } from "./participants";

import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import type { AttackKind, DamageKind, FlagEffect, FlagKey, StaticEffect, StatKey } from "@/lib/utils/abilities/schema";
import { isBakedStat, isStaticEffect } from "@/lib/utils/abilities/schema/kinds";
import type { AbilitySource } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export type ModifierQuery =
  | { stat: StatKey; attackKind?: AttackKind }
  | { damage: { kind: DamageKind; school?: string | null } }
  | { flag: FlagKey };

export interface ModifierEntry {
  label: string;
  sourceType: AbilitySource["type"] | "effect" | "action";
  flat: number;
  percent: number;
  flag?: FlagEffect;
  icon?: string | null;
}

export interface ModifierResult {
  flat: number;
  percent: number;
  flags: FlagEffect[];
  entries: ModifierEntry[];
}

function matchesQuery(effect: StaticEffect, query: ModifierQuery): boolean {
  if ("stat" in query) {
    return (
      effect.kind === "modifyStat" &&
      effect.stat === query.stat &&
      (!effect.attackKind || !query.attackKind || effect.attackKind === query.attackKind)
    );
  }

  if ("damage" in query) {
    if (effect.kind !== "damageBonus") return false;

    const { kind, school } = query.damage;

    const f = effect.filter;

    const kindOk = f.kind === "all" || f.kind === kind || (f.kind === "physical" && kind !== "magic");

    return kindOk && !(kind === "magic" && f.school && school && f.school !== school);
  }

  return effect.kind === "flag" && effect.flag === query.flag;
}

function appliesTo(target: StaticEffect["target"], source: BattleParticipant, subject: BattleParticipant): boolean {
  switch (target ?? "self") {
    case "self":
      return source.basicInfo.id === subject.basicInfo.id;
    case "allAllies":
      return source.basicInfo.side === subject.basicInfo.side;
    case "allEnemies":
      return source.basicInfo.side !== subject.basicInfo.side;
    default:
      return false;
  }
}

export function collectModifiers(
  participants: BattleParticipant[],
  participantId: string,
  query: ModifierQuery,
  extra: StaticEffect[] = [],
): ModifierResult {
  const result: ModifierResult = { flat: 0, percent: 0, flags: [], entries: [] };

  const subject = findParticipant(participants, participantId);

  if (!subject) return result;

  const add = (effect: StaticEffect, owner: BattleParticipant, label: string, sourceType: ModifierEntry["sourceType"], icon?: string | null) => {
    if (!matchesQuery(effect, query)) return;

    if (effect.kind === "flag") {
      result.flags.push(effect);
      result.entries.push({ label, sourceType, flat: 0, percent: 0, flag: effect, icon });

      return;
    }

    const flat = effect.flat !== undefined ? resolveFlat(effect.flat, owner) : 0;

    const percent = effect.percent ?? 0;

    result.flat += flat;
    result.percent += percent;
    result.entries.push({ label, sourceType, flat, percent, icon });
  };

  const skipPassive = "stat" in query && isBakedStat(query.stat);

  if (!skipPassive) {
    for (const source of participants) {
      if (source !== subject && !isActive(source)) continue;

      for (const ability of resolvedAbilitiesOf(source)) {
        if (ability.trigger.event !== "passive") continue;

        if (ability.condition && !evaluateCondition(ability.condition, { owner: source, event: null, participants })) continue;

        for (const effect of ability.effects) {
          if (isStaticEffect(effect) && appliesTo(effect.target, source, subject)) {
            add(effect, source, ability.name, ability.source.type, ability.source.icon);
          }
        }
      }
    }
  }

  for (const ae of subject.battleData.activeEffects) {
    for (const effect of ae.abilityEffects ?? legacyActiveEffectModifiers(ae)) add(effect, subject, ae.name, "effect", ae.icon ?? ae.source?.icon);
  }

  for (const effect of extra) add(effect, subject, "Ця дія", "action");

  return result;
}

export function statWithModifiers(
  participants: BattleParticipant[],
  id: string,
  stat: StatKey,
  base: number,
  opts: { extra?: StaticEffect[]; attackKind?: AttackKind } = {},
): number {
  const m = collectModifiers(participants, id, { stat, attackKind: opts.attackKind }, opts.extra);

  return Math.floor(base + m.flat + (base * m.percent) / 100);
}

export function findFlags<F extends FlagKey>(
  participants: BattleParticipant[],
  id: string,
  flag: F,
  extra?: StaticEffect[],
): Extract<FlagEffect, { flag: F }>[] {
  return collectModifiers(participants, id, { flag }, extra).flags as Extract<FlagEffect, { flag: F }>[];
}
