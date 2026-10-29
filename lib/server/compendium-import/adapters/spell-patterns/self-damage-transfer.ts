import type { SpellRecognizer } from "./index";

import { spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";

const SELF_HIT = /\byou (?:take|suffer) (\d+)d(\d+) (\w+) damage/i;

const GAINS = /\bregains? (?:a number of )?hit points equal to\b[^.]*\b(?:damage|amount|total)\b/i;

const SIDES = [4, 6, 8, 10, 12, 20] as const;

export const selfDamageTransfer: SpellRecognizer = ({ text, cast, ability, damageTypes }) => {
  const hit = SELF_HIT.exec(text);

  if (!hit || !GAINS.test(text) || ability) return null;

  const count = Number(hit[1]);

  const sides = Number(hit[2]) as (typeof SIDES)[number];

  if (!SIDES.includes(sides) || count < 1 || count > 40) return null;

  const range = spellRange(cast.facts);

  const targeting: SpellDefinition["targeting"] = { kind: "ally", ...(range !== "self" && { range }) };

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting,
        resolution: { kind: "auto" },
        dice: count,
        dieSides: sides,
        spellEffects: [
          { kind: "dealDamage", target: "self", amount: { spellRoll: 100 }, damageType: damageTypes[0] ?? hit[3].toLowerCase() },
          { kind: "heal", target: "eventTarget", amount: { percentOf: "eventDamage", value: 100 } },
        ],
      },
    },
  };
};
