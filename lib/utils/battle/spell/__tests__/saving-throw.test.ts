import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";

const rollSavingThrow = (t: ReturnType<typeof target>, ability: "dexterity", dc: number, rng: () => number, presetRoll?: number) => {
  const { roll, mod, total, success } = rollSave({ target: t, ability, dc, participants: [t], rng, presetRoll });

  return { roll, mod, total, success };
};

const target = () => {
  const p = makeParticipant({ id: "t" });

  return { ...p, abilities: { ...p.abilities, modifiers: { ...p.abilities.modifiers, dexterity: 2 } } };
};

describe("rollSavingThrow", () => {
  it("кидає d20 з rng і додає модифікатор характеристики", () => {
    expect(rollSavingThrow(target(), "dexterity", 12, () => 0.5)).toEqual({ roll: 11, mod: 2, total: 13, success: true });
  });

  it("провал нижче СК, успіх на рівні СК", () => {
    expect(rollSavingThrow(target(), "dexterity", 14, () => 0.5).success).toBe(false);
    expect(rollSavingThrow(target(), "dexterity", 13, () => 0.5).success).toBe(true);
  });

  it("готовий кидок не звертається до rng", () => {
    const rng = () => {
      throw new Error("rng used");
    };

    expect(rollSavingThrow(target(), "dexterity", 10, rng, 7)).toEqual({ roll: 7, mod: 2, total: 9, success: false });
  });
});
