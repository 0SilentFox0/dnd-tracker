import { describe, expect, it } from "vitest";

import { initialSpellFlow, spellFlow, spellPayload, type SpellPick } from "../spell-flow";

const pick: SpellPick = { spellId: "s", level: 1, targetMode: "single", needsSaves: true, inputDice: { label: "Висота", max: 20, sides: 6 }, diceSlots: [6] };

const picked = () => ({ ...spellFlow({ ...initialSpellFlow, step: "book", casterId: "c" }, { type: "PICK", pick }), targetIds: ["t"] });

describe("spell flow inputCount", () => {
  it("starts at one die and resizes the dice slots", () => {
    const s = spellFlow(picked(), { type: "SET_INPUT", count: 4 });

    expect(s.inputCount).toBe(4);
    expect(s.pick?.diceSlots).toEqual([6, 6, 6, 6]);
    expect(s.damage).toHaveLength(4);
  });

  it("clamps to the maximum", () => {
    expect(spellFlow(picked(), { type: "SET_INPUT", count: 25 }).pick?.diceSlots).toHaveLength(20);
  });

  it("goes into the payload", () => {
    expect(spellPayload(spellFlow(picked(), { type: "SET_INPUT", count: 3 })).inputCount).toBe(3);
  });

  it("a spell without input has no inputCount", () => {
    const plain = spellFlow(initialSpellFlow, { type: "PICK", pick: { ...pick, inputDice: undefined } });

    expect(spellPayload({ ...plain, casterId: "c" }).inputCount).toBeUndefined();
  });
});
