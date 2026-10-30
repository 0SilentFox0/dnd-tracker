import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { SPELL_COST_KEYS, SPELL_SAVE_ON_SUCCESS_KEYS, SPELL_TARGETING_KINDS, TEMPLATE_SHAPE_KEYS } from "@/lib/constants/spells";
import { FX_ARCHETYPES, FX_AURA_KINDS, FX_ELEMENTS } from "@/lib/utils/battle/fx/types";

const INLINE_TARGETING = SPELL_TARGETING_KINDS.filter((k) => k !== "area" && k !== "template");

describe("spells label keys", () => {
  expectLabelKeys("spells", "costs", SPELL_COST_KEYS);
  expectLabelKeys("spells", "inline.cost", SPELL_COST_KEYS);
  expectLabelKeys("spells", "targeting", SPELL_TARGETING_KINDS);
  expectLabelKeys("spells", "inline.targeting", INLINE_TARGETING);
  expectLabelKeys("spells", "shapes", [...TEMPLATE_SHAPE_KEYS, "ring"]);
  expectLabelKeys("spells", "saveOnSuccess", SPELL_SAVE_ON_SUCCESS_KEYS);
  expectLabelKeys("spells", "inline.saveOnSuccess", SPELL_SAVE_ON_SUCCESS_KEYS);
  expectLabelKeys("spells", "inline.resolution", ["auto", "attack", "save"]);
  expectLabelKeys("spells", "inline.area", ["enemy", "ally"]);
  expectLabelKeys("spells", "fx.archetypes", FX_ARCHETYPES);
  expectLabelKeys("spells", "fx.elements", FX_ELEMENTS);
  expectLabelKeys("spells", "fx.auras", FX_AURA_KINDS);
});
