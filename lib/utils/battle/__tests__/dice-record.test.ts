import { describe, expect, it } from "vitest";

import { attackDiceRolls, spellDiceRolls } from "@/lib/utils/battle/dice-record";

describe("attackDiceRolls", () => {
  it("один d20 і шкода з розмірами кожного кубика (слоти за зростанням розміру, як у diceSlots)", () => {
    expect(attackDiceRolls({ attackerId: "a", targetId: "t", d20: 14, damage: [5, 3], slots: [6, 8] })).toEqual([
      { kind: "attack", rollerId: "a", targetId: "t", dice: [{ sides: 20, value: 14 }] },
      { kind: "damage", rollerId: "a", targetId: "t", dice: [{ sides: 6, value: 5 }, { sides: 8, value: 3 }] },
    ]);
  });

  it("перевага: обидва d20, обраний позначений; рівні значення — позначений лише перший; серверний другий", () => {
    const [atk] = attackDiceRolls({ attackerId: "a", targetId: "t", d20: 7, second: { value: 7, serverRolled: true }, chosenD20: 7, damage: [], slots: [8] });

    expect(atk.dice).toEqual([{ sides: 20, value: 7, chosen: true }, { sides: 20, value: 7, server: true }]);
  });

  it("перевага: обрано другий", () => {
    const [atk] = attackDiceRolls({ attackerId: "a", targetId: "t", d20: 4, second: { value: 18, serverRolled: false }, chosenD20: 18, damage: [], slots: [8] });

    expect(atk.dice).toEqual([{ sides: 20, value: 4 }, { sides: 20, value: 18, chosen: true }]);
  });

  it("промах без шкоди — лише група attack; кидків менше за формулу — перші слоти", () => {
    expect(attackDiceRolls({ attackerId: "a", targetId: "t", d20: 2, damage: [], slots: [6, 6] })).toHaveLength(1);
    expect(attackDiceRolls({ attackerId: "a", targetId: "t", d20: 12, damage: [4], slots: [6, 6, 8] })[1].dice).toEqual([{ sides: 6, value: 4 }]);
  });

  it("кубик нестандартного розміру (d3, d100) не потрапляє в анімацію", () => {
    expect(attackDiceRolls({ attackerId: "a", targetId: "t", d20: 12, damage: [2, 5], slots: [3, 6] })[1].dice).toEqual([{ sides: 6, value: 5 }]);
  });
});

describe("attackDiceRolls: server flags and bounds", () => {
  it("d20 і кубики шкоди від індексу, докинуті сервером, мають server", () => {
    const [atk, dmg] = attackDiceRolls({ attackerId: "a", targetId: "t", d20: 9, d20Server: true, damage: [2, 5], slots: [6, 6], damageServerFrom: 1 });

    expect(atk.dice).toEqual([{ sides: 20, value: 9, server: true }]);
    expect(dmg.dice).toEqual([{ sides: 6, value: 2 }, { sides: 6, value: 5, server: true }]);
  });

  it("значення поза 1..sides відкидається", () => {
    expect(attackDiceRolls({ attackerId: "a", targetId: "t", d20: 9, damage: [9, 0, 4], slots: [6, 6, 6] })[1].dice).toEqual([{ sides: 6, value: 4 }]);
  });
});

describe("spellDiceRolls", () => {
  it("шкода кубиками і рятунки: введений і докинутий сервером", () => {
    expect(spellDiceRolls({ casterId: "c", sides: 6, rolls: [3, 6], heal: false, saves: [{ participantId: "x", roll: 11 }, { participantId: "y", roll: 4 }], presetSaveIds: new Set(["x"]) })).toEqual([
      { kind: "damage", rollerId: "c", dice: [{ sides: 6, value: 3 }, { sides: 6, value: 6 }] },
      { kind: "save", rollerId: "x", dice: [{ sides: 20, value: 11 }] },
      { kind: "save", rollerId: "y", dice: [{ sides: 20, value: 4, server: true }] },
    ]);
  });

  it("лікування; без кубиків і рятунків — порожньо", () => {
    expect(spellDiceRolls({ casterId: "c", sides: 8, rolls: [7], heal: true, saves: [], presetSaveIds: new Set() })[0].kind).toBe("heal");
    expect(spellDiceRolls({ casterId: "c", sides: 8, rolls: [], heal: false, saves: [], presetSaveIds: new Set() })).toEqual([]);
  });
});
