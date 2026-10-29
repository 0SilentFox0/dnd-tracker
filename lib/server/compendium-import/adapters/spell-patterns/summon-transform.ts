import type { SpellRecognizer } from "./index";

import type { NonRandomEffect } from "@/lib/utils/abilities/schema";
import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import { numberWord } from "@/lib/utils/spells/derive/text";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

const SUMMON_OBJECT = /\byou create an? (tiny|small|medium|large) animated ([a-z]+)\b[^.]*?\bin an unoccupied space\b[^.]*?\bwithin range\b/i;

const IMMOBILE = /\bcan(?:'|’)?t move\b/i;

const AURA = /\bany creature hostile to you that moves to a space within (\d+) feet of the [a-z]+ for the first time on a turn or starts its turn there\b/i;

const AURA_ATTACK = /\bmakes? an? (?:ranged|melee) (?:weapon|spell) attack, using your spell attack (?:modifier|bonus)\b[^.]*\.\s*On a hit, a creature takes (\d+d(?:4|6|8|10|12)) ([a-z]+) damage\b/i;

const BONUS_ATTACK = /\bon your turn, you can use a bonus action to make an? [a-z]+ use its [a-z ]+ attack against one creature within (\d+) feet of it\b/i;

const EXTRA_PER = /\bone additional [a-z]+ for every (\w+) slot levels? above\b/i;

const SIZES = { tiny: "tiny", small: "small", medium: "medium", large: "large" } as const;

export const summonObject: SpellRecognizer = ({ text, higher, cast, ability }) => {
  const made = SUMMON_OBJECT.exec(text);

  const aura = AURA.exec(text);

  const hit = AURA_ATTACK.exec(text);

  const bonus = BONUS_ATTACK.exec(text);

  const range = spellRange(cast.facts);

  if (!made || !aura || !hit || !bonus || !IMMOBILE.test(text) || ability || range === "self") return null;

  const radius = Number(aura[1]);

  const reach = Number(bonus[1]);

  if (radius % 5 !== 0 || radius > 60 || reach % 5 !== 0 || reach > 60) return null;

  const every = numberWord(EXTRA_PER.exec(higher)?.[1] ?? "");

  const rounds = durationRounds(cast.facts.duration);

  const damageType = hit[2].toLowerCase();

  const leaf: NonRandomEffect = { kind: "dealDamage", amount: hit[1], damageType, target: "eventTarget" };

  const summon: SpellEffect = {
    kind: "summonInline",
    name: made[2].replace(/^./, (c) => c.toUpperCase()),
    size: SIZES[made[1].toLowerCase() as keyof typeof SIZES],
    ac: "spellDc",
    hp: null,
    count: 1,
    ...(every && every >= 1 && every <= 9 && { upcastEvery: every }),
    aura: { radiusFeet: radius, side: "enemies", onEnter: { attack: "spell", effects: [leaf] }, onTurnStart: { attack: "spell", effects: [leaf] } },
    duration: { rounds },
  };

  const grant: SpellEffect = {
    kind: "grantCast",
    label: "Атака об'єкта",
    cost: "bonusAction",
    duration: { rounds },
    cast: { targeting: { kind: "enemy" }, resolution: { kind: "attack" }, dice: 0, perObjectFeet: reach, effects: [{ kind: "dealDamage", amount: hit[1], damageType }] },
  };

  return {
    native: {
      narrative: false,
      riders: [],
      fields: { targeting: { kind: "template", shape: "circle", size: 5, side: "enemy", maxTargets: 1, range }, resolution: { kind: "auto" }, dice: 0, spellEffects: [summon, grant] },
    },
  };
};

const TRANSFORM = /\btransforms? an? ([a-z]+) that you can see within range into\b/i;

const STATS_REPLACED = /\bstatistics[^.]*\bare replaced by the statistics of an? \{@creature ([^}|]+)(?:\|([^}|]*))?[^}]*\}/i;

const REVERT_AT_ZERO = /\bdrops to 0 hit points\b/i;

const MAX_DURATION_ROUNDS = 99;

export const transformSpell: SpellRecognizer = ({ raw, text, higher, cast, ability }) => {
  const target = TRANSFORM.exec(text);

  const form = STATS_REPLACED.exec(raw.replace(/\\"/g, '"'));

  const range = spellRange(cast.facts);

  if (!target || !form || !ability || !REVERT_AT_ZERO.test(text) || range === "self") return null;

  const rounds = durationRounds(cast.facts.duration);

  const riders = [...(/\b(?:hour|day)s?\b/i.test(cast.facts.duration) ? [`тривалість обрізана до ${MAX_DURATION_ROUNDS} раундів`] : []), ...(/\bduration increases\b/i.test(higher) ? ["подовження тривалості на вищих колах"] : []), "зовнішність нової форми: див. опис"];

  return {
    native: {
      narrative: false,
      riders,
      refs: [{ path: ["spellEffects", 0, "unitId"], kind: "monster", name: form[1].trim(), source: form[2]?.trim() ?? "" }],
      fields: {
        targeting: { kind: "enemy", range, filter: { creatureTypes: [target[1].toLowerCase()] } },
        resolution: { kind: "save", ability, onSuccess: "none" },
        dice: 0,
        spellEffects: [{ kind: "transform", unitId: form[1].trim(), revertAtZero: true, duration: { rounds } }],
      },
    },
  };
};
