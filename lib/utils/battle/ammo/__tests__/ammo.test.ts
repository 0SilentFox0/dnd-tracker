import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { ammoStatus, initAmmo, spendAmmo, tickReload } from "@/lib/utils/battle/ammo";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const bow: BattleAttack = { id: "bow", name: "Bow", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d6", damageType: "piercing", wfrp: { qualities: [], flaws: [], ammoCapacity: 2, reload: 1 } };

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

const archer = (battleData: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const p = createMockParticipant();

  return { ...p, battleData: { ...p.battleData, attacks: [bow, sword], ...battleData } };
};

describe("initAmmo", () => {
  it("maps attack id to capacity, undefined without capacity", () => {
    expect(initAmmo([bow, sword])).toEqual({ bow: 2 });
    expect(initAmmo([sword])).toBeUndefined();
  });
});

describe("ammoStatus", () => {
  it("ok / empty / reloading / legacy", () => {
    expect(ammoStatus(archer({ ammo: { bow: 1 } }), bow)).toBe("ok");
    expect(ammoStatus(archer({ ammo: { bow: 0 } }), bow)).toBe("empty");
    expect(ammoStatus(archer({ ammo: { bow: 0 }, reload: { bow: 2 } }), bow)).toBe("reloading");
    expect(ammoStatus(archer(), bow)).toBe("ok");
    expect(ammoStatus(archer({ ammo: { bow: 0 } }), sword)).toBe("ok");
  });
});

describe("spendAmmo", () => {
  it("decrements and arms reload (X+1) at zero", () => {
    const once = spendAmmo(archer({ ammo: { bow: 2 } }), bow);

    expect(once.battleData.ammo).toEqual({ bow: 1 });
    expect(once.battleData.reload).toBeUndefined();

    const empty = spendAmmo(once, bow);

    expect(empty.battleData.ammo).toEqual({ bow: 0 });
    expect(empty.battleData.reload).toEqual({ bow: 2 });
  });

  it("leaves unlimited and legacy participants untouched", () => {
    const legacy = archer();

    expect(spendAmmo(legacy, bow)).toBe(legacy);
    expect(spendAmmo(archer({ ammo: { bow: 2 } }), sword).battleData.ammo).toEqual({ bow: 2 });
  });
});

describe("tickReload", () => {
  it("counts down, then refills and drops the key", () => {
    const ticked = tickReload(archer({ ammo: { bow: 0 }, reload: { bow: 2 } }));

    expect(ticked.battleData.reload).toEqual({ bow: 1 });
    expect(ticked.battleData.ammo).toEqual({ bow: 0 });

    const done = tickReload(ticked);

    expect(done.battleData.reload).toBeUndefined();
    expect(done.battleData.ammo).toEqual({ bow: 2 });
  });

  it("is a no-op without reload", () => {
    const p = archer({ ammo: { bow: 1 } });

    expect(tickReload(p)).toBe(p);
  });
});
