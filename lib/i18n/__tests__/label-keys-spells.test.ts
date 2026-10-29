import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { SPELL_COST_LABELS, SPELL_SAVE_ON_SUCCESS_LABELS, SPELL_TARGETING_LABELS, TEMPLATE_SHAPE_LABELS } from "@/lib/constants/spells";
import { FX_ARCHETYPES, FX_AURA_KINDS, FX_ELEMENTS } from "@/lib/utils/battle/fx/types";

const INLINE_TARGETING = Object.keys(SPELL_TARGETING_LABELS).filter((k) => k !== "area" && k !== "template");

describe("spells label keys", () => {
  expectLabelKeys("spells", "costs", Object.keys(SPELL_COST_LABELS));
  expectLabelKeys("spells", "inline.cost", Object.keys(SPELL_COST_LABELS));
  expectLabelKeys("spells", "targeting", Object.keys(SPELL_TARGETING_LABELS));
  expectLabelKeys("spells", "inline.targeting", INLINE_TARGETING);
  expectLabelKeys("spells", "shapes", [...Object.keys(TEMPLATE_SHAPE_LABELS), "ring"]);
  expectLabelKeys("spells", "saveOnSuccess", Object.keys(SPELL_SAVE_ON_SUCCESS_LABELS));
  expectLabelKeys("spells", "inline.saveOnSuccess", Object.keys(SPELL_SAVE_ON_SUCCESS_LABELS));
  expectLabelKeys("spells", "inline.resolution", ["auto", "attack", "save"]);
  expectLabelKeys("spells", "inline.area", ["enemy", "ally"]);
  expectLabelKeys("spells", "fx.archetypes", FX_ARCHETYPES);
  expectLabelKeys("spells", "fx.elements", FX_ELEMENTS);
  expectLabelKeys("spells", "fx.auras", FX_AURA_KINDS);
});
