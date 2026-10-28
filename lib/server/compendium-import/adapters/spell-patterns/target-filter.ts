import type { SpellRecognizer } from "./index";

import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import { numberWord } from "@/lib/utils/spells/derive/text";
import type { SpellDefinition, SpellTargetFilter } from "@/lib/utils/spells/model/schema";

const BEAST_CR = /\bbeast\b[^.]*?\b(?:challenge rating|CR) (?:of )?(\d+(?:\/\d+)?) or lower/i;

const CR_PER_LEVEL = /\b(?:challenge rating|CR)\b[^.]*?\bincreases? by (\w+) for each (?:slot )?level above/i;

const crOf = (s: string): number => {
  const [n, d] = s.split("/").map(Number);

  return d ? n / d : n;
};

const SINGLE_HUMANOID = /\b(?:a|one) humanoid(?: that)? you can see within range\b/i;

export function targetFilterFromText(text: string, higher: string): SpellTargetFilter | null {
  const beast = BEAST_CR.exec(text);

  if (!beast) return SINGLE_HUMANOID.test(text) ? { creatureTypes: ["humanoid"] } : null;

  const perLevel = numberWord(CR_PER_LEVEL.exec(higher)?.[1] ?? "") ?? 0;

  return { creatureTypes: ["beast"], maxCr: crOf(beast[1]), ...(perLevel > 0 && perLevel <= 5 && { maxCrPerLevel: perLevel }) };
}

export const withTargetFilter = (targeting: SpellDefinition["targeting"], text: string, higher: string): SpellDefinition["targeting"] => {
  const filter = targetFilterFromText(text, higher);

  if (!filter || !["ally", "enemy", "area", "template"].includes(targeting.kind)) return targeting;

  return { ...targeting, filter } as SpellDefinition["targeting"];
};

const INCAPACITATED_SELF = /\byou (?:are|become|remain) \{@condition incapacitated|\byour body is (?:considered )?(?:\{@condition )?(?:unconscious|incapacitated)/i;

const CHARM = /\{@condition charmed|\byou take (?:total )?(?:and precise )?control of (?:it|the (?:beast|creature))/i;

export const controlAnimal: SpellRecognizer = ({ raw, text, higher, cast, ability }) => {
  const filter = targetFilterFromText(text, higher);

  if (!filter || !ability || !CHARM.test(raw) || !INCAPACITATED_SELF.test(raw)) return null;

  const range = spellRange(cast.facts);

  const rounds = durationRounds(cast.facts.duration);

  return {
    native: {
      narrative: false,
      riders: ["наказ цілі: див. опис"],
      fields: {
        targeting: { kind: "enemy", ...(range !== "self" && { range }), filter },
        resolution: { kind: "save", ability, onSuccess: "none" },
        dice: 0,
        spellEffects: [
          { kind: "applyCondition", condition: "charmed", duration: { rounds } },
          { kind: "applyCondition", condition: "incapacitated", target: "self", onlyIfAffected: true, duration: { rounds } },
        ],
      },
    },
  };
};

const AT_LEAST_SPEED = /\byour (?:walking )?speed (?:becomes|is) at least (\d+) feet|\byou have a (?:walking )?speed of (\d+) feet|\bwalking speed of (\d+) feet, which you can use while (?:riding|operating)\b/i;

export const speedAtLeast: SpellRecognizer = ({ text, cast, ability, damageTypes }) => {
  const m = AT_LEAST_SPEED.exec(text);

  if (!m || ability || damageTypes.length > 0) return null;

  const atLeast = Number(m[1] ?? m[2] ?? m[3]);

  return {
    native: {
      narrative: false,
      riders: ["один вершник: див. опис"],
      fields: {
        targeting: { kind: "self" },
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: [{ kind: "modifyStat", stat: "speed", atLeast, duration: { rounds: durationRounds(cast.facts.duration) } }],
      },
    },
  };
};
