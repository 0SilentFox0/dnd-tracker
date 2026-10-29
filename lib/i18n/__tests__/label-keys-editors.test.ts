import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { SPELL_ONLY_EFFECT_KINDS } from "@/lib/utils/spells/model/schema";

describe("spell effect editor labels have translations", () => {
  expectLabelKeys("editors", "spellEffects.kinds", SPELL_ONLY_EFFECT_KINDS);
  expectLabelKeys("editors", "spellEffects.fields.inputDice", ["label", "max"]);
  expectLabelKeys("editors", "spellEffects.fields.createTerrain", ["terrain", "shape", "cells", "rounds"]);
  expectLabelKeys("editors", "spellEffects.fields.transform", ["unitId", "duration"]);
  expectLabelKeys("editors", "spellEffects.options.terrain", ["wall", "difficult"]);
  expectLabelKeys("editors", "spellEffects.options.shape", ["cell", "line"]);
});

describe("spell effect editor nested labels", () => {
  expectLabelKeys("editors", "spellEffects", ["delete", "nested.chooseOneHeading", "nested.chooseOneAdd", "hints.moveSelf", "hints.revertAtZero"]);
});
