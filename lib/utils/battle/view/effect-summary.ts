import { legacyActiveEffectModifiers } from "@/lib/utils/abilities/engine/legacy-active-effects";
import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { ActiveEffect } from "@/types/battle";

const rounds = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "раунд" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "раунди" : "раундів"}`;

const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Що робить активний ефект — для підказки на чипі: опис або описи його модифікаторів, DoT/HoT, залишок і джерело. */
export function effectSummary(e: ActiveEffect): string[] {
  const what = e.description ? [e.description] : (e.abilityEffects ?? legacyActiveEffectModifiers(e)).map((x) => capitalize(describeEffect(x)));

  return [
    ...what,
    ...(e.dotDamage ? [`${e.dotDamage.damagePerRound} шкоди (${e.dotDamage.damageType}) щораунду`] : []),
    ...(e.hotHeal ? [`+${e.hotHeal.healPerRound} HP щораунду`] : []),
    e.zone ? `у зоні аури до наступного ходу ${e.source?.name ?? "власника"}` : e.permanent ? "діє постійно" : `ще ${rounds(e.duration)}`,
    ...(e.source ? [`від: ${e.source.abilityName ? `${e.source.abilityName} (${e.source.name})` : e.source.name}`] : []),
  ].filter(Boolean);
}
