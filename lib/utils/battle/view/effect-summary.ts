import type { Translator } from "@/lib/i18n/translator";
import { legacyActiveEffectModifiers } from "@/lib/utils/abilities/engine/effects/legacy-active-effects";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { joinSegments } from "@/lib/utils/abilities/segments";
import { capitalize } from "@/lib/utils/common/text";
import type { ActiveEffect } from "@/types/battle";

const rounds = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "раунд" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "раунди" : "раундів"}`;


/** Що саме робить ефект: опис або описи його модифікаторів (без повторів). */
export function effectLines(e: ActiveEffect, t: Translator): string[] {
  if (e.description) return [e.description];

  const guards = e.effects.filter((d) => d.type === "guard").map((d) => `${e.source?.name ?? "Захисник"} бере на себе ${d.value}% шкоди від атак`);

  const text = (x: Effect) => capitalize(joinSegments(t, describeEffect(x)));

  return [...new Set([...(e.abilityEffects ?? legacyActiveEffectModifiers(e)).map(text), ...guards])];
}

/** Що робить активний ефект — для підказки на чипі: опис або описи його модифікаторів, DoT/HoT, залишок і джерело. */
export function effectSummary(e: ActiveEffect, t: Translator): string[] {
  const what = effectLines(e, t);

  return [
    ...what,
    ...(e.dotDamage ? [`${e.dotDamage.dice ?? e.dotDamage.damagePerRound} шкоди (${e.dotDamage.damageType}) щораунду`] : []),
    ...(e.hotHeal ? [`+${e.hotHeal.healPerRound} HP щораунду`] : []),
    e.zone ? `у зоні аури до наступного ходу ${e.source?.name ?? "власника"}` : e.permanent ? "діє постійно" : `ще ${rounds(e.duration)}`,
    ...(e.source ? [`від: ${e.source.abilityName ? `${e.source.abilityName} (${e.source.name})` : e.source.name}`] : []),
  ].filter(Boolean).filter((line, i, all) => all.indexOf(line) === i);
}

const displayKey = (e: ActiveEffect) =>
  e.abilityEffects && !e.description && !e.zone ? [e.name, e.type, e.permanent ? "p" : e.duration, e.source?.participantId, e.source?.abilityName].join("|") : null;

/** Кілька ефектів одного вміння з однаковою тривалістю (напр. «Сурми світанку»: ініціатива і шкода) — один запис для показу. */
export function mergeEffectsForDisplay(effects: ActiveEffect[]): ActiveEffect[] {
  const out: ActiveEffect[] = [];

  const byKey = new Map<string, number>();

  for (const e of effects) {
    const key = displayKey(e);

    const at = key === null ? undefined : byKey.get(key);

    if (at === undefined) {
      if (key !== null) byKey.set(key, out.length);

      out.push(e);
      continue;
    }

    const first = out[at];

    out[at] = { ...first, abilityEffects: [...(first.abilityEffects ?? []), ...(e.abilityEffects ?? [])], effects: [...first.effects, ...e.effects] };
  }

  return out;
}
