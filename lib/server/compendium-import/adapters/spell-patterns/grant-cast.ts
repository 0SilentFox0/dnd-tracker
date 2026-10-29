import type { SpellRecognizer } from "./index";

import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { InlineCast } from "@/lib/utils/spells/model/schema";

const USE_ATTACK = /\b(you|(?:a|the) (?:creature|target|ally)[^.]{0,30}?)\s+(?:can|may)\s+(?:use|take)\s+(?:a|an|your|its|their)\s+(bonus action|action|reaction)\s+to make an? (melee|ranged) spell attack\b/i;

const DAMAGE = /(\d+)d(4|6|8|10|12|20)\b(?:\s*\+\s*(your [a-z ]*modifier|its [a-z ]*modifier))?[^.]{0,20}?\b([a-z]+) damage/i;

const WITHIN = /\bwithin (\d+) feet\b/i;

const COSTS = { "bonus action": "bonusAction", action: "action", reaction: "reaction" } as const;

export const grantSpellAttack: SpellRecognizer = ({ text, cast, ability, damageTypes }) => {
  const use = USE_ATTACK.exec(text);

  if (!use || ability) return null;

  const rest = text.slice(use.index + use[0].length);

  const dmg = DAMAGE.exec(rest);

  const damageType = damageTypes[0] ?? dmg?.[4]?.toLowerCase();

  if (!dmg || !damageType) return null;

  const melee = use[3].toLowerCase() === "melee";

  const range = WITHIN.exec(rest)?.[1];

  const owner = /^you$/i.test(use[1]);

  const hostRange = spellRange(cast.facts);

  const inline: InlineCast = {
    targeting: { kind: "enemy", ...(melee ? { range: 5 } : range && { range: Math.min(600, Math.max(5, Number(range))) }) },
    resolution: { kind: "attack" },
    dice: Number(dmg[1]),
    dieSides: Number(dmg[2]) as InlineCast["dieSides"],
    ...(dmg[3] && { addAbilityMod: true }),
    effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType }],
  };

  return {
    native: {
      narrative: false,
      riders: [],
      fields: {
        targeting: owner || hostRange === "self" ? { kind: "self" } : { kind: "ally", range: hostRange },
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: [{ kind: "grantCast", label: "Атака заклинанням", cost: COSTS[use[2].toLowerCase() as keyof typeof COSTS], duration: { rounds: durationRounds(cast.facts.duration) }, ...(!owner && { target: "eventTarget" }), cast: inline }],
      },
    },
  };
};
