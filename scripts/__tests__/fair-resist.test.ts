import { describe, expect, it } from "vitest";

import { UNITS } from "../../data/library/units";
import { unitRow } from "../seed-library-lib";

import { ParticipantSide } from "@/lib/constants/battle";
import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { buildPartyPower, pickEnemyRoster } from "@/lib/utils/battle/balance";
import { unitResistances } from "@/lib/utils/battle/balance/resist";
import { unitRowStats, type UnitStatsRow } from "@/lib/utils/battle/balance/unit-library";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";

const maps = { groups: new Map<string, string>(), spells: new Map<string, string>() };

async function libraryUnit(key: string) {
  const unit = UNITS.find((u) => u.key === key);

  if (!unit) throw new Error(key);

  const row = { ...unitRow({ ...unit, raceKey: null }, maps, new Map()), id: key, campaignId: "c", immunities: [] } as unknown as UnitFromPrisma;

  const participant = await createBattleParticipantFromUnit(row, "", ParticipantSide.ENEMY, 1, {});

  const resist = unitResistances(participant);

  return { participant, resist, stats: unitRowStats(row as unknown as UnitStatsRow, new Map(), resist) };
}

const heroes = (damageKey: string) => buildPartyPower([1, 2, 3].map(() => ({ stats: { dpr: 12, hp: 40, toHit: 7, ac: 15, weaponDpr: 12, damageKey }, hero: true })));

const size = (roster: Array<{ quantity: number }> | undefined) => (roster ?? []).reduce((a, r) => a + r.quantity, 0);

describe("опори в чесному балансі", () => {
  it("Скелет-воїн: опори читаються з учасника бою (Кістяне тіло + Великий щит)", async () => {
    const { resist } = await libraryUnit("necromancers-skeleton-warrior");

    expect(resist["ranged:piercing"]).toBe(80);
    expect(resist["melee:piercing"]).toBe(50);
    expect(resist["melee:bludgeoning"]).toBeLessThan(0);
  });

  it("Скелет-воїн проти лучників — менший склад, ніж проти булав", async () => {
    const { stats } = await libraryUnit("necromancers-skeleton-warrior");

    const bows = pickEnemyRoster(heroes("ranged:piercing"), [stats]);

    const maces = pickEnemyRoster(heroes("melee:bludgeoning"), [stats]);

    expect(size(bows?.roster)).toBeLessThan(size(maces?.roster));
  });

  it("імунітет до магії з поля immunities доходить до опору `spell`", async () => {
    const { participant } = await libraryUnit("necromancers-skeleton-warrior");

    const immune = { ...participant, battleData: { ...participant.battleData, resolvedAbilities: immunityAbilities(["магії"], { type: "unit", id: "x" }) } };

    expect(unitResistances(immune)).toMatchObject({ spell: 100 });
  });
});
