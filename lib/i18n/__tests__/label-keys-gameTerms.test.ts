import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { ABILITY_KEYS, STAT_SCORES } from "@/lib/constants/abilities";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { MONSTER_SENSE_KEYS, MONSTER_SIZES } from "@/lib/constants/monster";
import { DND_SKILLS } from "@/lib/constants/skills";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";

const CREATURE_TYPES = ["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"];

describe("game terms have translations", () => {
  expectLabelKeys("gameTerms", "dndSkills", DND_SKILLS);
  expectLabelKeys("gameTerms", "abilities", ABILITY_KEYS.flatMap((k) => [`${k}.label`, `${k}.short`]));
  expectLabelKeys("gameTerms", "stats", STAT_SCORES.map((s) => s.key));
  expectLabelKeys("gameTerms", "spellLevels", Array.from({ length: 10 }, (_, i) => String(i)));
  expectLabelKeys("gameTerms", "ungrouped", ["spellGroup", "mainSkill", "race", "artifactSet", "branch"]);
  expectLabelKeys("gameTerms", "damageTypes", DAMAGE_ELEMENT_OPTIONS.map((o) => o.value));
  expectLabelKeys("gameTerms", "monster", ["fly", "swim", "climb", "burrow", "hover", "distance", "passivePerception", "languages", "telepathy"]);
  expectLabelKeys("gameTerms", "monster.senses", MONSTER_SENSE_KEYS);
  expectLabelKeys("gameTerms", "monster.sizes", MONSTER_SIZES);
  expectLabelKeys("gameTerms", "weaponTraits.traits", WEAPON_TRAITS);
  expectLabelKeys("gameTerms", "creatureTypes", CREATURE_TYPES);
  expectLabelKeys("gameTerms", "creatureType", CREATURE_TYPES);
});
