import type { SpellRecognizer } from "./index";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { durationRounds, spellRange } from "@/lib/utils/spells/derive/mechanics";
import type { SpellZone } from "@/lib/utils/spells/model/schema";

const RADIUS_SPHERE = /\b(\d+)-foot-radius sphere\b/i;

const OBSCURED = /\bthe area is heavily obscured\b/i;

const DIFFICULT = /\b(?:the )?(?:affected )?area (?:is|becomes) difficult terrain\b/i;

const LEAVE_SAVE = /\bwhen a creature (?:attempts|tries) to leave the (?:spell's )?area,? it must make an? (\w+) saving throw\b[^.]*\.\s*on a failed save,? it is pulled back\b[^.]*\bcenter\b/i;

const CHOSEN_IGNORE = /\bcreatures of your choice\b[^.]*\bignore\b/i;

const MAX_ZONE_ROUNDS = 10;

export const terrainZoneSpell: SpellRecognizer = ({ text, cast }) => {
  const radius = RADIUS_SPHERE.exec(text);

  const obscured = OBSCURED.test(text);

  const difficult = DIFFICULT.test(text);

  if (!radius || (!obscured && !difficult)) return null;

  const leave = LEAVE_SAVE.exec(text);

  const abilityKey = ABILITY_KEYS.find((k) => k === leave?.[1].toLowerCase());

  const range = spellRange(cast.facts);

  const zone: SpellZone = {
    rounds: Math.min(MAX_ZONE_ROUNDS, durationRounds(cast.facts.duration)),
    terrain: [...(difficult ? (["difficult"] as const) : []), ...(obscured ? (["obscured"] as const) : [])],
    side: "enemies",
    ...(abilityKey && { onExit: { save: { ability: abilityKey }, effects: [], pull: "centre" as const } }),
  };

  return {
    native: {
      narrative: false,
      riders: [...(CHOSEN_IGNORE.test(text) ? ["істоти за вибором кастера ігнорують ефекти: див. опис"] : []), ...(durationRounds(cast.facts.duration) > MAX_ZONE_ROUNDS ? ["зона діє не довше 10 раундів"] : [])],
      fields: {
        targeting: { kind: "template", shape: "circle", size: Math.min(120, Number(radius[1])), side: "enemy", maxTargets: 20, exact: true, ...(range !== "self" && { range }), zone },
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: [],
      },
    },
  };
};

const WALL_CELL = /\b(?:wall|structure)\b[^.]{0,80}?\b(?:5 feet tall,? (?:and )?5 feet wide|(?:a|one) 5-foot cube)\b/i;

const SAVE_OR_DAMAGE = /\bsaving throw\b|\bdamage\b|\battack roll\b/i;

export const wallSpell: SpellRecognizer = ({ text, cast, ability, damageTypes }) => {
  if (!WALL_CELL.test(text) || ability || damageTypes.length > 0 || SAVE_OR_DAMAGE.test(text.replace(/\bhit points\b/gi, ""))) return null;

  const range = spellRange(cast.facts);

  const rounds = durationRounds(cast.facts.duration);

  return {
    native: {
      narrative: false,
      riders: ["міцність (КЗ, HP) і знищення стіни: див. опис"],
      fields: {
        targeting: { kind: "template", shape: "cube", size: 5, side: "enemy", maxTargets: 1, ...(range !== "self" && { range }) },
        resolution: { kind: "auto" },
        dice: 0,
        spellEffects: [{ kind: "createTerrain", terrain: "wall", shape: "cell", cells: 1, rounds }],
      },
    },
  };
};

const LINE_TERRAIN = /\b(?:ground|area|space)s? (?:in|along) a (?:straight )?line between you and (?:the|your|a) target (?:becomes?|turns? into) difficult terrain\b/i;

const LINE_TERRAIN_ROUNDS = 10;

/** Складна місцевість по лінії від кастера до цілі: ефект додається до решти механіки заклинання. */
export const lineTerrainEffect = (text: string, range: number | "self"): { kind: "createTerrain"; terrain: "difficult"; shape: "line"; cells: number; rounds: number } | null =>
  LINE_TERRAIN.test(text) ? { kind: "createTerrain", terrain: "difficult", shape: "line", cells: Math.min(20, range === "self" ? 6 : Math.max(1, Math.ceil(range / 5))), rounds: LINE_TERRAIN_ROUNDS } : null;
