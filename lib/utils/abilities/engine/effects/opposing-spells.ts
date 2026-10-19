import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const SPELL_KEY = "spell:";

const signOf = (v: unknown) => (typeof v === "number" ? Math.sign(v) : 0);

function axisOf(e: StaticEffect): { axis: string; sign: number } | null {
  if (e.kind === "flag") return null;

  const sign = signOf(e.flat) || signOf(e.percent);

  if (!sign) return null;

  return { axis: e.kind === "modifyStat" ? `stat:${e.stat}:${e.attackKind ?? ""}` : `dmg:${e.filter.kind}:${e.filter.school ?? ""}`, sign };
}

const opposes = (a: StaticEffect, b: StaticEffect) => {
  const x = axisOf(a);

  const y = axisOf(b);

  return !!x && !!y && x.axis === y.axis && x.sign !== y.sign;
};

/** Протилежні заклинання (Поспіх ↔ Сповільнення, Кам'яна шкіра ↔ Немічність…) не складаються: нове знімає з цілі ефект іншого заклинання на тому ж статі з протилежним знаком. */
export function dropOpposingSpellEffects(p: BattleParticipant, abilityKey: string, effect: StaticEffect): { participant: BattleParticipant; removed: ActiveEffect[] } {
  if (!abilityKey.startsWith(SPELL_KEY)) return { participant: p, removed: [] };

  const isOpposing = (e: ActiveEffect) =>
    !!e.abilityKey?.startsWith(SPELL_KEY) && !e.abilityKey.startsWith(`${abilityKey}#`) && !!e.abilityEffects?.some((s) => opposes(s, effect));

  const removed = p.battleData.activeEffects.filter(isOpposing);

  if (!removed.length) return { participant: p, removed };

  return { participant: { ...p, battleData: { ...p.battleData, activeEffects: p.battleData.activeEffects.filter((e) => !isOpposing(e)) } }, removed };
}
