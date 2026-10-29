import { createTranslator } from "use-intl/core";
import { describe, expect, it } from "vitest";

import { expectLabelKeys } from "../test/label-keys";
import { translateIssue } from "../translate-issue";
import type { Translator } from "../translator";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { GoalKind } from "@/lib/constants/characters";
import { localSource } from "@/lib/i18n/local-source";

describe("character profile labels have translations", () => {
  expectLabelKeys("characterProfile", "tabs", ["basic", "combat", "skills", "choices", "magic", "items", "story", "log", "things"]);
  expectLabelKeys("characterProfile", "goals", Object.values(GoalKind));
  expectLabelKeys("characterProfile", "goals.status", ["active", "done", "failed"]);
  expectLabelKeys("characterProfile", "tokens.colors", ["red", "green"]);
  expectLabelKeys("characterProfile", "tokens.counters", ["red", "green"]);
  expectLabelKeys("characterProfile", "sheet.lines", ["base", "proficiency", "weapon", "weaponDice", "levelDice", "dmMultiplier", "noArmor", "dexterityCapped", "hitDice", "bonuses"]);
  expectLabelKeys("characterProfile", "sheet.spellOrigin", ["lineage", "feat", "race", "background", "class"]);
  expectLabelKeys("characterProfile", "sheet.from", ["background", "classLevel", "origin", "dm"]);
});

describe("sheet line keys render the Ukrainian text word for word", () => {
  it("capped dexterity and ability picks", async () => {
    const messages = { common: await localSource.load("uk", "common"), characterProfile: await localSource.load("uk", "characterProfile") };

    const t = createTranslator({ locale: "uk", messages }) as unknown as Translator;

    expect(translateIssue(t, { message: "characterProfile.sheet.lines.dexterityCapped", params: { cap: 2 } })).toBe("Спритність (межа 2)");
    expect(translateIssue(t, { message: "characterProfile.sheet.lines.hitDice", params: { dice: "3d10" } })).toBe("Кістки хітів: 3d10");
    expect(translateIssue(t, { message: "common.abilities.dexterity.label" })).toBe("Спритність");
    expect(translateIssue(t, { message: "Fire Ring" })).toBe("Fire Ring");

    for (const ability of ABILITY_KEYS) expect(translateIssue(t, { message: "characterProfile.sheet.abilityPick", params: { n: 2, ability } })).toMatch(/^\+2 [А-ЯІ]{3}$/);
  });
});
