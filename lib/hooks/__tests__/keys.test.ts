import { describe, expect, it } from "vitest";

import { abilityKeys } from "../abilities/keys";
import { artifactSetKeys } from "../artifact-sets/keys";
import { artifactKeys } from "../artifacts/keys";
import { battleKeys } from "../battles/keys";
import { campaignKeys } from "../campaigns/keys";
import { characterKeys } from "../characters/keys";
import { raceKeys } from "../races/keys";
import { skillKeys } from "../skills/keys";
import { spellKeys } from "../spells/keys";
import { unitKeys } from "../units/keys";

const C = "c1";

const allKeys: ReadonlyArray<readonly unknown[]> = [
  abilityKeys.sources(C),
  artifactSetKeys.list(C),
  artifactKeys.list(C),
  battleKeys.scene(C, "b1"),
  battleKeys.list(C),
  battleKeys.active(),
  battleKeys.balance(C),
  battleKeys.balanceAll(),
  campaignKeys.members(C),
  characterKeys.lists(C),
  characterKeys.list(C, "all", false),
  characterKeys.detail(C, "ch1"),
  characterKeys.details(C),
  characterKeys.sheet(C),
  characterKeys.sheet(C, "ch1"),
  raceKeys.list(C),
  skillKeys.list(C),
  skillKeys.byMainSkill(C, "m1"),
  skillKeys.detail(C, "s1"),
  skillKeys.mainSkills(C),
  skillKeys.trees(C),
  skillKeys.progressionOf(C),
  skillKeys.progression(C, "ch1"),
  spellKeys.list(C),
  spellKeys.byIds(C, "a,b"),
  spellKeys.detail(C, "sp1"),
  spellKeys.groups(C),
  unitKeys.list(C),
  unitKeys.detail(C, "u1"),
];

describe("ключі TanStack Query", () => {
  it("перший сегмент — kebab-case", () => {
    for (const key of allKeys) expect(String(key[0])).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it("префікс-ключі інвалідують свої похідні", () => {
    const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) => prefix.every((part, i) => key[i] === part);

    expect(startsWith(characterKeys.list(C, "all", false), characterKeys.lists(C))).toBe(true);
    expect(startsWith(characterKeys.detail(C, "ch1"), characterKeys.details(C))).toBe(true);
    expect(startsWith(characterKeys.sheet(C, "ch1"), characterKeys.sheet(C))).toBe(true);
    expect(startsWith(skillKeys.progression(C, "ch1"), skillKeys.progressionOf(C))).toBe(true);
    expect(startsWith(skillKeys.byMainSkill(C, "m1"), skillKeys.list(C))).toBe(true);
    expect(startsWith(spellKeys.byIds(C, "a"), spellKeys.list(C))).toBe(true);
    expect(startsWith(battleKeys.balance(C), battleKeys.balanceAll())).toBe(true);
  });
});
