import { resolveAbilities } from "./resolve";

import type { Effect } from "@/lib/utils/abilities/schema";
import type { ResolvedAbility } from "@/types/abilities";

const RULES: Array<{ match: RegExp; effect: Effect }> = [
  { match: /^(вогн(ю|я|ь)|вогонь|fire)$/, effect: { kind: "flag", flag: "resistance", damageType: "fire", percent: 100 } },
  { match: /^(отру(єння|ти|та)|poison)$/, effect: { kind: "flag", flag: "resistance", damageType: "poison", percent: 100 } },
  { match: /^(магії|магія|чарівництва|magic|spell)$/, effect: { kind: "flag", flag: "resistance", damageType: "spell", percent: 100 } },
  { match: /^(контролю|контроль|control)$/, effect: { kind: "flag", flag: "conditionImmunity", conditions: "all" } },
  { match: /^(страху|страх|fear)$/, effect: { kind: "flag", flag: "conditionImmunity", conditions: ["fear"] } },
];

export function immunityAbilities(immunities: string[], source: { type: "unit" | "character"; id: string }): ResolvedAbility[] {
  const effects: Effect[] = [];

  const seen = new Set<string>();

  for (const raw of immunities) {
    const text = raw.trim().toLowerCase();

    if (!text) continue;

    const rule = RULES.find((r) => r.match.test(text));

    const effect: Effect = rule?.effect ?? { kind: "note", text: `Імунітет: ${text}` };

    const key = JSON.stringify(effect);

    if (seen.has(key)) continue;

    seen.add(key);
    effects.push(effect);
  }

  if (effects.length === 0) return [];

  return resolveAbilities({ type: source.type, id: source.id, name: "Імунітети" }, [
    { id: "immunities", name: "Імунітети", trigger: { event: "passive" }, effects },
  ]);
}
