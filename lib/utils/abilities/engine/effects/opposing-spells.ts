import { type TimedEffectInput, upsertTimedEffect } from "./timed-effects";

import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const SPELL_KEY = "spell:";

const signOf = (v: unknown) => (typeof v === "number" ? Math.sign(v) : 0);

interface Axis {
  axis: string;
  sign: number;
}

function axisOf(e: StaticEffect): Axis | null {
  if (e.kind === "flag") return null;

  const sign = signOf(e.flat) || signOf(e.percent);

  if (!sign) return null;

  return { axis: e.kind === "modifyStat" ? `stat:${e.stat}:${e.attackKind ?? ""}` : `dmg:${e.filter.kind}:${e.filter.school ?? ""}`, sign };
}

const axesOf = (effects: readonly StaticEffect[]) => effects.flatMap((e) => axisOf(e) ?? []);

const clash = (xs: Axis[], ys: Axis[]) => xs.some((x) => ys.some((y) => x.axis === y.axis && x.sign !== y.sign));

const spellFamily = (timedKey: string) => timedKey.split("#")[0];

/** Протилежні заклинання (Поспіх ↔ Сповільнення, Кам'яна шкіра ↔ Немічність…) не складаються: нове знімає з цілі ефект іншого заклинання на тому ж статі з протилежним знаком. */
function dropOpposingSpellEffects(p: BattleParticipant, abilityKey: string, effects: readonly StaticEffect[]): { participant: BattleParticipant; removed: ActiveEffect[] } {
  if (!abilityKey.startsWith(SPELL_KEY)) return { participant: p, removed: [] };

  const incoming = axesOf(effects);

  const kept: ActiveEffect[] = [];

  const removed: ActiveEffect[] = [];

  for (const e of p.battleData.activeEffects) {
    const opposing = !!e.abilityKey?.startsWith(SPELL_KEY) && !e.abilityKey.startsWith(`${abilityKey}#`) && clash(axesOf(e.abilityEffects ?? []), incoming);

    (opposing ? removed : kept).push(e);
  }

  if (!removed.length) return { participant: p, removed };

  return { participant: { ...p, battleData: { ...p.battleData, activeEffects: kept } }, removed };
}

export function applySpellTimedEffect(p: BattleParticipant, input: TimedEffectInput, round: number): { participant: BattleParticipant; removed: ActiveEffect[] } {
  const { participant, removed } = dropOpposingSpellEffects(p, spellFamily(input.timedKey), input.abilityEffects ?? []);

  return { participant: upsertTimedEffect(participant, input, round), removed };
}
