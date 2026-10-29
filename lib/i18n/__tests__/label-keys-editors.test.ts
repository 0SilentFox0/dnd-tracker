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

describe("spell effect editor T6.3 labels", () => {
  expectLabelKeys("editors", "spellEffects.fields.hitRider", ["attackKind", "extraDice", "damageType", "charges", "duration", "target", "consumeOnMiss", "expireAtTurnEnd", "save", "onFail"]);
  expectLabelKeys("editors", "spellEffects.fields.grantCast", ["label", "cost", "uses", "duration", "target", "castHeading", "castEffects", "advanced", "cast.dice", "cast.dieSides", "cast.damageBonus", "cast.addAbilityMod", "cast.anchorMarkId", "cast.perObjectFeet", "cast.auto.on"]);
  expectLabelKeys("editors", "spellEffects.fields.anchoredZone", ["radiusFeet", "side", "duration", "excludeBearer", "endsWhenStartOutside", "onEnter", "onTurnStart"]);
  expectLabelKeys("editors", "spellEffects.options", ["attackKind.melee", "attackKind.ranged", "attackKind.any", "target.self", "target.eventTarget", "cost.action", "cost.bonusAction", "cost.reaction", "side.enemies", "side.allies", "side.all", "cast.auto.on.attackAgainstMarked", "cast.auto.on.damageToMarked"]);
  expectLabelKeys("editors", "spellEffects.zone", ["check", "ability", "pull", "effects", "addEffect", "checks.none", "checks.save", "checks.attack"]);
});

describe("spell effect editor T6.4 labels", () => {
  expectLabelKeys("editors", "spellEffects.fields.summonInline", ["name", "size", "ac", "acSpellDc", "hp", "hpItem", "count", "upcastEvery", "duration", "attacks", "addAttack", "removeAttack", "auraToggle", "attack.name", "attack.attackBonus", "attack.damageDice", "attack.damageType", "attack.range", "aura.radiusFeet", "aura.side", "aura.onEnter", "aura.onTurnStart"]);
  expectLabelKeys("editors", "spellEffects.options", ["size.tiny", "size.small", "size.medium", "size.large", "aura.side.enemies", "aura.side.allies", "aura.side.all"]);
});
