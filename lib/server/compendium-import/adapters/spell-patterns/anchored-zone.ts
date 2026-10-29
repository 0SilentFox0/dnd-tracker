import type { SpellRecognizer } from "./index";

import type { NonRandomEffect } from "@/lib/utils/abilities/schema";
import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

const AROUND_TARGET = /\beach creature (?:of your choice )?within (\d+) feet of (?:the|that) target\b/i;

const NO_ACTION = /\bcan(?:'|’)?t take (?:any )?actions?\b/i;

const NO_BONUS = /\bcan(?:'|’)?t take (?:any )?(?:actions? (?:or|and) )?bonus actions?\b/i;

const ENDS_OUTSIDE = /\bends (?:if|when) it starts its turn outside\b/i;

const EXCEPT_TARGET = /\b(?:other than|except) the target\b/i;

export const anchoredZoneSpell: SpellRecognizer = ({ text, cast, ability }) => {
  const around = AROUND_TARGET.exec(text);

  const radius = Number(around?.[1]);

  const range = spellRange(cast.facts);

  if (!around || !ability || !(NO_ACTION.test(text) || NO_BONUS.test(text)) || radius % 5 !== 0 || radius > 60 || range === "self") return null;

  const rounds = durationRounds(cast.facts.duration);

  const effects: NonRandomEffect[] = [...(NO_ACTION.test(text) ? [{ kind: "applyCondition" as const, condition: "skip_action" as const, duration: { rounds } }] : []), ...(NO_BONUS.test(text) ? [{ kind: "applyCondition" as const, condition: "no_bonus_action" as const, duration: { rounds } }] : [])];

  const zone: SpellEffect = {
    kind: "anchoredZone",
    radiusFeet: radius,
    side: "all",
    ...(EXCEPT_TARGET.test(text) && { excludeBearer: true }),
    onEnter: { save: { ability }, effects },
    onTurnStart: { save: { ability }, effects },
    ...(ENDS_OUTSIDE.test(text) && { endsWhenStartOutside: true }),
    duration: { rounds },
  };

  return { native: { narrative: false, riders: [], fields: { targeting: { kind: "enemy", range }, resolution: { kind: "auto" }, dice: 0, spellEffects: [zone] } } };
};
