import { capitalizeLine, lineKey, textRef } from "@/lib/i18n/text-ref";
import type { Translator } from "@/lib/i18n/translator";
import { legacyActiveEffectModifiers } from "@/lib/utils/abilities/engine/effects/legacy-active-effects";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { joinSegments } from "@/lib/utils/abilities/segments";
import type { ActiveEffect } from "@/types/battle";
import type { LogLine } from "@/types/text";

const uniqueLines = (lines: LogLine[]): LogLine[] => lines.filter((line, i) => lines.findIndex((other) => lineKey(other) === lineKey(line)) === i);

/** Engine-made effects carry a translatable `label`; the rest show their content `name`. */
export const effectTitle = (e: Pick<ActiveEffect, "name" | "label">): LogLine => e.label ?? e.name;

/** Що саме робить ефект: опис або описи його модифікаторів (без повторів). */
export function effectLines(e: ActiveEffect, t: Translator): LogLine[] {
  if (e.description) return [e.description];

  const guards = e.effects.filter((d) => d.type === "guard").map((d) => textRef("battle.view.effects.guard", { name: e.source?.name ?? textRef("battle.view.effects.guardian"), value: d.value ?? 0 }));

  const text = (x: Effect) => capitalizeLine(joinSegments(t, describeEffect(x)));

  return uniqueLines([...(e.abilityEffects ?? legacyActiveEffectModifiers(e)).map(text), ...guards]);
}

/** Що робить активний ефект — для підказки на чипі: опис або описи його модифікаторів, DoT/HoT, залишок і джерело. */
export function effectSummary(e: ActiveEffect, t: Translator): LogLine[] {
  const what = effectLines(e, t);

  return [
    ...what,
    ...(e.dotDamage ? [textRef("battle.view.effects.dot", { damage: e.dotDamage.dice ?? e.dotDamage.damagePerRound, type: e.dotDamage.damageType })] : []),
    ...(e.hotHeal ? [textRef("battle.view.effects.hot", { heal: e.hotHeal.healPerRound })] : []),
    e.zone ? textRef("battle.view.effects.zone", { name: e.source?.name ?? textRef("battle.view.effects.owner") }) : e.permanent ? textRef("battle.view.effects.permanent") : textRef("battle.view.effects.roundsLeft", { count: e.duration }),
    ...(e.source ? [textRef("battle.view.effects.from", { source: e.source.abilityName ? `${e.source.abilityName} (${e.source.name})` : e.source.name })] : []),
  ].filter(Boolean).filter((line, i, all) => all.findIndex((other) => lineKey(other) === lineKey(line)) === i);
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
