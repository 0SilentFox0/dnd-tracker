import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { resolveFlat } from "@/lib/utils/abilities/engine/amount";
import { resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/participants";
import type { Effect } from "@/lib/utils/abilities/schema";
import { isBakedStat } from "@/lib/utils/abilities/schema/kinds";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

type ModifyStat = Extract<Effect, { kind: "modifyStat" }>;

function bakeOne(p: BattleParticipant, e: ModifyStat, owner: BattleParticipant): BattleParticipant {
  const flat = e.flat !== undefined ? resolveFlat(e.flat, owner) : 0;

  const pct = (base: number) => flat + Math.floor((base * (e.percent ?? 0)) / 100);

  const cs = p.combatStats;

  switch (e.stat) {
    case "maxHp": {
      const d = pct(cs.maxHp);

      return { ...p, combatStats: { ...cs, maxHp: cs.maxHp + d, currentHp: cs.currentHp + d } };
    }
    case "speed":
      return { ...p, combatStats: { ...cs, speed: cs.speed + pct(cs.speed) } };
    case "morale":
      return { ...p, combatStats: { ...cs, morale: Math.max(-3, Math.min(3, cs.morale + flat)) } };
    case "minTargets":
    case "maxTargets":
      return { ...p, combatStats: { ...cs, [e.stat]: cs[e.stat] + flat } };
    case "initiative":
      return { ...p, abilities: { ...p.abilities, baseInitiative: p.abilities.baseInitiative + flat, initiative: p.abilities.initiative + flat } };
    case "spellSlots": {
      const slots = { ...p.spellcasting.spellSlots };

      for (const level of e.spellLevels ?? []) {
        const s = slots[String(level)] ?? { max: 0, current: 0 };

        slots[String(level)] = { max: s.max + flat, current: s.current + flat };
      }

      return { ...p, spellcasting: { ...p.spellcasting, spellSlots: slots } };
    }
    default: {
      if (!(ABILITY_KEYS as readonly string[]).includes(e.stat)) return p;

      const stat = e.stat as (typeof ABILITY_KEYS)[number];

      const score = p.abilities[stat] + flat;

      return { ...p, abilities: { ...p.abilities, [stat]: score, modifiers: { ...p.abilities.modifiers, [stat]: getAbilityModifier(score) } } };
    }
  }
}

function bakedEffects(p: BattleParticipant): { effect: ModifyStat; target: string }[] {
  return resolvedAbilitiesOf(p)
    .filter((a) => a.trigger.event === "passive" && !a.condition)
    .flatMap((a) => a.effects)
    .filter((e): e is ModifyStat => e.kind === "modifyStat" && isBakedStat(e.stat))
    .map((effect) => ({ effect, target: effect.target ?? "self" }));
}

export function bakePassives(p: BattleParticipant): BattleParticipant {
  return bakedEffects(p)
    .filter((x) => x.target === "self")
    .reduce((acc, { effect }) => bakeOne(acc, effect, p), p);
}

export function applyBakedAuras(ps: BattleParticipant[], newIds: Set<string>): BattleParticipant[] {
  let out = ps;

  for (const source of ps) {
    for (const { effect, target } of bakedEffects(source)) {
      if (target !== "allAllies" && target !== "allEnemies") continue;

      out = out.map((r) => {
        const sameSide = r.basicInfo.side === source.basicInfo.side;

        const hits = target === "allAllies" ? sameSide : !sameSide;

        const fresh = newIds.has(source.basicInfo.id) || newIds.has(r.basicInfo.id);

        return hits && fresh ? bakeOne(r, effect, source) : r;
      });
    }
  }

  return out;
}

export function bakedStatSources(p: BattleParticipant, stat: string): { label: string; value: number; sourceType: ResolvedAbility["source"]["type"] }[] {
  return resolvedAbilitiesOf(p)
    .filter((a) => a.trigger.event === "passive" && !a.condition)
    .flatMap((a) =>
      a.effects
        .filter((e): e is ModifyStat => e.kind === "modifyStat" && e.stat === stat && (e.target ?? "self") === "self")
        .map((e) => ({ label: a.source.name, value: e.flat === undefined ? 0 : resolveFlat(e.flat, p), sourceType: a.source.type })),
    )
    .filter((x) => x.value !== 0);
}
