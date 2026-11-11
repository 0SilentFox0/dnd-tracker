import { describe, expect, it } from "vitest";

import { slotOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { woundsMax } from "@/systems/wfrp/rules/characteristics/derive";
import { readCharacteristics } from "@/systems/wfrp/rules/characteristics/keys";
import { wfrpHeroView, wfrpParticipantView } from "@/systems/wfrp/server/ai";
import type { BattleParticipant } from "@/types/battle";

const careers = [{ id: "c1", name: "Archivist", tiers: [{ name: "Copyist" }, { name: "Archivist" }] }];

const row = { characteristics: { base: { ws: 35, t: 40, s: 30, wp: 30 }, career: { careerId: "c1", tier: 2, ticks: [] }, fate: 2 } };

describe("wfrpHeroView", () => {
  it("characteristics, wounds, fate and career tier", () => {
    const view = wfrpHeroView(row, careers);

    expect(view.characteristics.ws).toBe(35);
    expect(view.woundsMax).toBe(woundsMax(readCharacteristics(row)));
    expect(view.fate).toBe(2);
    expect(view.career).toEqual({ name: "Archivist", tier: 2, tierName: "Archivist" });
  });

  it("unknown career id gives null career", () => {
    expect(wfrpHeroView(row, []).career).toBeNull();
  });
});

describe("wfrpParticipantView", () => {
  it("wounds without ac", () => {
    const p = { basicInfo: { name: "Hans", side: "ally" }, combatStats: { currentHp: 7, maxHp: 12, status: "active", armorClass: 9 }, abilities: { system: slotOf(readCharacteristics(row)) } } as unknown as BattleParticipant;

    const view = wfrpParticipantView(p);

    expect(view).toMatchObject({ name: "Hans", side: "ally", wounds: "7/12", status: "active" });
    expect(view.characteristics?.ws).toBe(35);
    expect(view).not.toHaveProperty("ac");
  });
});
