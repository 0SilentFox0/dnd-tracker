import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { PROFICIENCY_KINDS } from "@/lib/constants/artifacts";
import { MONSTER_SENSE_LABELS } from "@/lib/constants/monster";
import { DND_SKILLS } from "@/lib/constants/skills";
import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { FLAG_REGISTRY } from "@/lib/utils/abilities/registry/effects/flags";
import { MANEUVERS } from "@/lib/utils/abilities/registry/effects/maneuver";

const DELEGATED_EFFECTS = ["flag", "note", "grantAction"];

const DAMAGE_TYPES = ["fire", "cold", "lightning", "acid", "poison", "necrotic", "radiant", "thunder", "psychic", "force", "bludgeoning", "piercing", "slashing", "bleed"];

describe("ability text has translations", () => {
  expectLabelKeys("abilityText", "effects", [...Object.keys(EFFECT_REGISTRY).filter((k) => !DELEGATED_EFFECTS.includes(k)), "unknown"]);
  expectLabelKeys("abilityText", "flags", Object.keys(FLAG_REGISTRY));
  expectLabelKeys("abilityText", "attackKind", ["all", "melee", "ranged"]);
  expectLabelKeys("abilityText", "conditionShort", ["fear", "berserk", "charm"]);
  expectLabelKeys("abilityText", "grant", ["extra", "action", "bonusAction", "reaction"]);
  expectLabelKeys("gameTerms", "damageTypes", DAMAGE_TYPES);
  expectLabelKeys("gameTerms", "abilities", ABILITY_KEYS.map((k) => `${k}.label`));
  expectLabelKeys("abilityRegistry", "options.skills", DND_SKILLS);
  expectLabelKeys("abilityRegistry", "options.kinds", PROFICIENCY_KINDS);
  expectLabelKeys("abilityRegistry", "options.sense", Object.keys(MONSTER_SENSE_LABELS));
  expectLabelKeys("abilityRegistry", "options.maneuver", MANEUVERS);
});
