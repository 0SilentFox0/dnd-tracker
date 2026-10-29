import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { buildSpellPick, initialSpellFlow, optionMissing, spellFlow, spellPayload } from "@/lib/utils/battle/flows/spell-flow";
import type { BookSpell } from "@/types/spells";

const spell = {
  id: "s1",
  name: "Синтетичний вибір",
  level: 0,
  cost: "action",
  dice: 0,
  targeting: { kind: "ally" },
  resolution: { kind: "auto" },
  spellEffects: [{ kind: "chooseOne", options: [{ kind: "heal", amount: 5 }, { kind: "modifyStat", stat: "speed", flat: 10, duration: { rounds: 2 } }] }],
} as unknown as BookSpell;

const caster = makeParticipant({ id: "c" });

const picked = () => spellFlow({ ...initialSpellFlow, step: "book", casterId: "c" }, { type: "PICK", pick: buildSpellPick([caster], caster, spell) });

describe("spell option picker state", () => {
  it("the pick lists described options and casting is blocked until one is chosen", () => {
    const s = picked();

    expect(s.pick?.options).toHaveLength(2);
    expect(optionMissing(s)).toBe(true);
    expect(spellPayload(s)).not.toHaveProperty("optionIndex");
  });

  it("SET_OPTION stores the index and the payload carries it", () => {
    const s = spellFlow(picked(), { type: "SET_OPTION", index: 1 });

    expect(optionMissing(s)).toBe(false);
    expect(spellPayload(s)).toMatchObject({ optionIndex: 1 });
  });

  it("an out-of-range index is ignored and picking again resets the choice", () => {
    const s = spellFlow(picked(), { type: "SET_OPTION", index: 5 });

    expect(s.optionIndex).toBeUndefined();

    const again = spellFlow(spellFlow(s, { type: "SET_OPTION", index: 0 }), { type: "PICK", pick: buildSpellPick([caster], caster, spell) });

    expect(again.optionIndex).toBeUndefined();
  });

  it("a spell without chooseOne never needs an option", () => {
    const plain = { ...spell, spellEffects: [{ kind: "heal", amount: 5 }] } as unknown as BookSpell;

    const s = spellFlow({ ...initialSpellFlow, step: "book", casterId: "c" }, { type: "PICK", pick: buildSpellPick([caster], caster, plain) });

    expect(s.pick?.options).toBeUndefined();
    expect(optionMissing(s)).toBe(false);
  });
});
