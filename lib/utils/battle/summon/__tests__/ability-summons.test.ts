import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { BattleParticipant } from "@/types/battle";

const elemental = {
  id: "u-fire", campaignId: "c1", name: "Елементаль вогню", raceId: null, level: 4, strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 13, initiative: 2, speed: 30, maxHp: 40, proficiencyBonus: 2, attacks: [{ name: "Удар", type: "melee", attackBonus: 4, damageDice: "1d6", damageType: "fire" }],
  knownSpells: [], avatar: null, createdAt: new Date(), immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [],
} as unknown as UnitFromPrisma;

const deps: SummonDeps = { loadPool: async () => ({ units: [elemental], races: [] }) };

const withPassive = (p: BattleParticipant, effects: Parameters<typeof resolved>[0]["effects"]) => ({ ...p, battleData: { ...p.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects })] } });

const run = (order: BattleParticipant[], spellId?: string) => applyAbilitySummons([{ ownerId: "druid", unitId: "u-fire", count: 1, spellId }], order, { campaignId: "c1", battleId: "b1", rng: () => 0, deps });

const summoned = (order: BattleParticipant[]) => order.filter((p) => p.battleData.summonedBy === "druid");

describe("applyAbilitySummons", () => {
  it("extraSummons додає істот лише для заклять зі списку", async () => {
    const druid = withPassive(makeParticipant({ id: "druid" }), [{ kind: "flag", flag: "extraSummons", count: 1, spellIds: ["sp-fire"] }]);

    expect(summoned((await run([druid], "sp-fire")).order)).toHaveLength(2);
    expect(summoned((await run([druid], "sp-other")).order)).toHaveLength(1);
    expect(summoned((await run([druid])).order)).toHaveLength(1);
  });

  it("banishSummons живого ворога знімає частку HP прикликаної істоти", async () => {
    const druid = makeParticipant({ id: "druid" });

    const banisher = withPassive(makeParticipant({ id: "e1", side: ParticipantSide.ENEMY }), [{ kind: "flag", flag: "banishSummons", percent: 50 }]);

    const r = await run([druid, banisher]);

    const [fire] = summoned(r.order);

    expect(fire.combatStats.currentHp).toBe(Math.ceil(fire.combatStats.maxHp / 2));
    expect(r.messages.some((m) => textOf(m).startsWith("🚫 Вигнання"))).toBe(true);
  });

  it("союзне «Вигнання» не діє на власних прикликаних", async () => {
    const druid = withPassive(makeParticipant({ id: "druid" }), [{ kind: "flag", flag: "banishSummons", percent: 50 }]);

    const [fire] = summoned((await run([druid])).order);

    expect(fire.combatStats.currentHp).toBe(fire.combatStats.maxHp);
  });
});
