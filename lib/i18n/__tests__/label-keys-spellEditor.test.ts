import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { SPELL_RESOLUTION_KEYS, SPELL_SIDE_KEYS } from "@/components/spells/form/spell-form-defaults";

const FORM_FIELD_PATHS = ["spell", "name", "level", "groupId", "icon", "description", "appearanceDescription", "cost", "dice", "targeting", "targetingRange", "targetingSize", "targetingMaxTargets", "targetingSide", "targetingShape", "targetingZone", "targetingZoneRounds", "resolution", "spellEffects", "raceModifiers", "stackable", "maxStacks", "dieSides", "upcastDice", "upcastTargets", "fx"];

describe("spellEditor label keys", () => {
  expectLabelKeys("spellEditor", "power.resolution", SPELL_RESOLUTION_KEYS);
  expectLabelKeys("spellEditor", "power.sides", SPELL_SIDE_KEYS);
  expectLabelKeys("spellEditor", "fields", FORM_FIELD_PATHS);
});
