import { describe, expect, it } from "vitest";

import { readSrdData } from "../lib/data-files";

const data = readSrdData();

describe("SRD monster actions and references", () => {
  it("adds 149 real actions with unique names, fixed dice and full source descriptions", () => {
    const actions = data.spells.filter((s) => s.groupId === "Monster Actions");

    expect(actions).toHaveLength(149);
    expect(new Set(data.spells.map((s) => s.name)).size).toBe(data.spells.length);
    expect(actions.every((s) => s.fixedDice && s.spellEffects.length > 0 && s.description.includes("Saving Throw: DC"))).toBe(true);
  });

  it("resolves every unit grant and linked action", () => {
    const names = new Set(data.spells.map((s) => s.name));

    const errors = data.units.flatMap((u) => [
      ...(u.spellcasting?.spells ?? []).filter((s) => !names.has(s.spellId)).map((s) => `${u.name}/grant/${s.spellId}`),
      ...u.abilities.flatMap((a) => {
        const perform = a.perform;

        if (!perform) return [];

        if (perform.kind === "spell") return names.has(perform.spellId) ? [] : [`${u.name}/spell/${perform.spellId}`];

        return u.attacks.some((attack) => attack.name.toLowerCase() === perform.attack.toLowerCase()) ? [] : [`${u.name}/attack/${perform.attack}`];
      }),
    ]);

    expect(errors).toEqual([]);
    expect(data.units.flatMap((u) => u.abilities).filter((a) => a.perform)).toHaveLength(79);
  });

  it("uses exact circles and omits target range for emanations", () => {
    expect(data.spells.filter((s) => s.targeting.kind === "template" && s.targeting.shape === "circle").every((s) => s.targeting.kind === "template" && s.targeting.exact)).toBe(true);
    expect(data.spells.filter((s) => s.targeting.kind === "template" && s.targeting.shape === "emanation").every((s) => !("range" in s.targeting))).toBe(true);
  });
});
