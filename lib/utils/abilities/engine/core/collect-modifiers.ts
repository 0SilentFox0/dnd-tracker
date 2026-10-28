import { resolveFlat } from "./amount";
import { staticEffectStrength } from "./effect-strength";
import { findParticipant, isActive, isDormant, isEscaped, resolvedAbilitiesOf } from "./participants";

import { legacyActiveEffectModifiers } from "@/lib/utils/abilities/engine/effects/legacy-active-effects";
import { countMarks } from "@/lib/utils/abilities/engine/effects/marks";
import { liveActiveEffects } from "@/lib/utils/abilities/engine/effects/zone-effects";
import { evaluateCondition, hasCreatureTypeCondition } from "@/lib/utils/abilities/registry/conditions";
import type { AttackKind, DamageKind, FlagEffect, FlagKey, StaticEffect, StatKey } from "@/lib/utils/abilities/schema";
import { isBakedStat, isStaticEffect } from "@/lib/utils/abilities/schema/kinds";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export type ModifierQuery =
  | { stat: StatKey; attackKind?: AttackKind }
  | { damage: { kind: DamageKind; school?: string | null; targetId?: string } }
  | { flag: FlagKey }
  | { flags: readonly FlagKey[] };

export interface ModifierEntry {
  label: string;
  sourceType: AbilitySource["type"] | "effect" | "action";
  flat: number;
  percent: number;
  atLeast?: number;
  flag?: FlagEffect;
  icon?: string | null;
  /** назва вміння, раси, артефакту чи ефекту, що дав модифікатор */
  source?: string;
  condition?: string;
}

type EntryMeta = Pick<ModifierEntry, "label" | "sourceType" | "icon" | "source" | "condition">;

export interface ModifierResult {
  flat: number;
  percent: number;
  atLeast?: number;
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

  if ("flags" in query) return effect.kind === "flag" && query.flags.includes(effect.flag);

  return effect.kind === "flag" && effect.flag === query.flag;
}

const outOfPlay = (source: BattleParticipant, subject: BattleParticipant) => isEscaped(source) || isEscaped(subject);

export function appliesTo(target: StaticEffect["target"], source: BattleParticipant, subject: BattleParticipant): boolean {
  switch (target ?? "self") {
    case "self":
      return source.basicInfo.id === subject.basicInfo.id;
    case "allAllies":
      return source.basicInfo.side === subject.basicInfo.side && (source.basicInfo.id === subject.basicInfo.id || !outOfPlay(source, subject));
    case "allEnemies":
      return source.basicInfo.side !== subject.basicInfo.side && !outOfPlay(source, subject) && !isDormant(subject);
    default:
      return false;
  }
}

export function isAuraTarget(target: StaticEffect["target"]): boolean {
  return target === "allAllies" || target === "allEnemies";
}

// Editor-made ids ("a1", "a2"…) repeat across owners, so they only dedupe within one source; library ids are global.
export function auraKey(ability: ResolvedAbility): string {
  return /^a\d+$/.test(ability.id) ? ability.key : ability.id;
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

  const push = (entry: ModifierEntry) => {
    if (entry.flag) result.flags.push(entry.flag);

    result.flat += entry.flat;
    result.percent += entry.percent;

    if (entry.atLeast !== undefined) result.atLeast = Math.max(result.atLeast ?? 0, entry.atLeast);

    result.entries.push(entry);
  };

  const entryOf = (effect: StaticEffect, owner: BattleParticipant, meta: EntryMeta): ModifierEntry | null => {
    if (!matchesQuery(effect, query)) return null;

    if (effect.kind === "flag") return { ...meta, flat: 0, percent: 0, flag: effect };

    let multiplier = 1;

    if (effect.kind === "damageBonus" && effect.perMark) {
      const targetId = "damage" in query ? query.damage.targetId : undefined;

      multiplier = targetId ? countMarks(findParticipant(participants, targetId), effect.perMark, owner.basicInfo.id) : 0;

      if (multiplier === 0) return null;
    }

    const flat = (effect.flat !== undefined ? resolveFlat(effect.flat, owner) : 0) * multiplier;

    const percent = (effect.percent !== undefined ? resolveFlat(effect.percent, owner) : 0) * multiplier;

    return { ...meta, flat, percent, ...(effect.kind === "modifyStat" && effect.atLeast !== undefined && { atLeast: effect.atLeast }) };
  };

  const add = (effect: StaticEffect, owner: BattleParticipant, meta: EntryMeta) => {
    const entry = entryOf(effect, owner, meta);

    if (entry) push(entry);
  };

  const skipPassive = "stat" in query && isBakedStat(query.stat);

  if (!skipPassive) {
    const auras = new Map<string, { entries: ModifierEntry[]; strength: number }>();

    for (const source of participants) {
      if (source !== subject && !isActive(source)) continue;

      for (const ability of resolvedAbilitiesOf(source)) {
        if (ability.trigger.event !== "passive") continue;

        const targetId = "damage" in query ? query.damage.targetId : undefined;

        const event = hasCreatureTypeCondition(ability.condition) && targetId ? { type: "spellCast" as const, phase: "before" as const, actorId: source.basicInfo.id, targetIds: [targetId] } : null;

        if (ability.condition && !evaluateCondition(ability.condition, { owner: source, event, participants })) continue;

        const auraEntries: ModifierEntry[] = [];

        let auraStrength = 0;

        for (const effect of ability.effects) {
          if (!isStaticEffect(effect) || !appliesTo(effect.target, source, subject)) continue;

          const entry = entryOf(effect, source, { label: ability.name, sourceType: ability.source.type, icon: ability.source.icon, source: ability.source.name });

          if (!entry) continue;

          if (isAuraTarget(effect.target)) {
            auraEntries.push(entry);
            auraStrength += staticEffectStrength(effect, source);
          } else {
            push(entry);
          }
        }

        if (auraEntries.length === 0) continue;

        const key = auraKey(ability);

        const kept = auras.get(key);

        if (!kept || auraStrength > kept.strength) auras.set(key, { entries: auraEntries, strength: auraStrength });
      }
    }

    for (const { entries } of auras.values()) entries.forEach(push);
  }

  for (const ae of liveActiveEffects(subject, participants)) {
    const owner = (ae.zone && findParticipant(participants, ae.zone.ownerId)) || subject;

    const condition = ae.effects.find((m) => m.type === "blinded" || m.type === "invisible")?.type;

    for (const effect of ae.abilityEffects ?? legacyActiveEffectModifiers(ae)) add(effect, owner, { label: ae.name, sourceType: "effect", icon: ae.icon ?? ae.source?.icon, source: ae.name, ...(condition && { condition }) });
  }

  for (const effect of extra) add(effect, subject, { label: "Ця дія", sourceType: "action" });

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

  const value = Math.floor(base + m.flat + (base * m.percent) / 100);

  return m.atLeast === undefined ? value : Math.max(value, m.atLeast);
}

export function findFlags<F extends FlagKey>(
  participants: BattleParticipant[],
  id: string,
  flag: F,
  extra?: StaticEffect[],
): Extract<FlagEffect, { flag: F }>[] {
  return collectModifiers(participants, id, { flag }, extra).flags as Extract<FlagEffect, { flag: F }>[];
}

export function findFlagsMany<F extends FlagKey>(
  participants: BattleParticipant[],
  id: string,
  flags: readonly F[],
  extra?: StaticEffect[],
): { [K in F]: Extract<FlagEffect, { flag: K }>[] } {
  const found = collectModifiers(participants, id, { flags }, extra).flags;

  return Object.fromEntries(flags.map((flag) => [flag, found.filter((f) => f.flag === flag)])) as { [K in F]: Extract<FlagEffect, { flag: K }>[] };
}
