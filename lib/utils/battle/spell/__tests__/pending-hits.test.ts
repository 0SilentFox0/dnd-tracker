import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import { castSpell } from "@/lib/utils/battle/spell";
import { resolvePendingHits } from "@/lib/utils/battle/spell/pending-hits";
import { processStartOfTurn } from "@/lib/utils/battle/turn/turn-start";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 40, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const caster = () => at({ ...makeParticipant({ id: "c" }), spellcasting: { ...makeParticipant({ id: "c" }).spellcasting, spellSlots: { "5": { max: 2, current: 2 } } } }, { x: 0, y: 5 });

const foe = (x: number, over: Partial<BattleParticipant> = {}) => ({ ...at(makeParticipant({ id: "f", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }), { x, y: 5 }), ...over });

const swarm: CastableSpell = {
  id: "swarm",
  name: "Синтетичний рій",
  level: 5,
  groupId: null,
  definition: { dice: 8, dieSides: 6, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "slashing", delayIfBeyond: { feet: 30, perRoundFeet: 30 } }], raceModifiers: [] },
};

const cast = (target: BattleParticipant) => {
  const c = caster();

  return castSpell({ caster: c, spell: swarm, targetIds: ["f"], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [3, 3, 3, 3, 3, 3, 3, 3], rng: () => 0.4, map });
};

const hp = (ps: BattleParticipant[], id = "f") => ps.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

describe("dealDamage.delayIfBeyond", () => {
  it("target within 30 ft is hit at once", () => {
    const r = cast(foe(6));

    expect(hp(r.allParticipantsUpdated)).toBeLessThan(200);
    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "c")?.battleData.pendingHits).toBeUndefined();
  });

  it("target at 70 ft: no damage now, one pending hit on the caster in round 3", () => {
    const r = cast(foe(14));

    expect(hp(r.allParticipantsUpdated)).toBe(200);

    const pending = r.allParticipantsUpdated.find((p) => p.basicInfo.id === "c")?.battleData.pendingHits;

    expect(pending).toHaveLength(1);
    expect(pending?.[0]).toMatchObject({ targetId: "f", atRound: 3, damageType: "slashing" });
    expect(r.messages.join(" ")).toContain("прибуде в раунді 3");
  });

  it("without a map the hit is immediate", () => {
    const c = caster();

    const r = castSpell({ caster: c, spell: swarm, targetIds: ["f"], allParticipants: [c, foe(14)], currentRound: 1, battleId: "b", diceRolls: [3, 3, 3, 3, 3, 3, 3, 3], rng: () => 0.4 });

    expect(hp(r.allParticipantsUpdated)).toBeLessThan(200);
  });

  it("same seed gives the same pending hit", () => {
    expect(cast(foe(14)).allParticipantsUpdated.find((p) => p.basicInfo.id === "c")?.battleData.pendingHits).toEqual(cast(foe(14)).allParticipantsUpdated.find((p) => p.basicInfo.id === "c")?.battleData.pendingHits);
  });

  it("schema accepts delayIfBeyond and rejects off-grid values", () => {
    const ok = (delayIfBeyond: unknown) => EffectSchema.safeParse({ kind: "dealDamage", amount: 1, delayIfBeyond }).success;

    expect(ok({ feet: 30, perRoundFeet: 30 })).toBe(true);
    expect(ok({ feet: 33, perRoundFeet: 30 })).toBe(false);
    expect(ok({ feet: 30 })).toBe(false);
  });
});

describe("resolvePendingHits", () => {
  const withPending = (target: BattleParticipant) => cast(target).allParticipantsUpdated;

  const rng = () => 0.5;

  it("nothing arrives before the round, then damage once and the record is removed", () => {
    const ps = withPending(foe(14));

    const early = resolvePendingHits(ps, "c", { round: 2, rng });

    expect(hp(early.participants)).toBe(200);
    expect(early.participants.find((p) => p.basicInfo.id === "c")?.battleData.pendingHits).toHaveLength(1);

    const hit = resolvePendingHits(ps, "c", { round: 3, rng });

    expect(hp(hit.participants)).toBe(176);
    expect(hit.participants.find((p) => p.basicInfo.id === "c")?.battleData.pendingHits).toBeUndefined();

    expect(hp(resolvePendingHits(hit.participants, "c", { round: 4, rng }).participants)).toBe(176);
  });

  it("dead target: the record is dropped without damage", () => {
    const ps = withPending(foe(14)).map((p) => (p.basicInfo.id === "f" ? { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: CombatStatus.DEAD } } : p));

    const r = resolvePendingHits(ps, "c", { round: 3, rng });

    expect(hp(r.participants)).toBe(0);
    expect(r.participants.find((p) => p.basicInfo.id === "c")?.battleData.pendingHits).toBeUndefined();
    expect(r.messages.join(" ")).toContain("недоступна");
  });

  it("start of the caster's turn delivers the hit, even if the caster is down", () => {
    const ps = withPending(foe(14));

    const casterP = ps.find((p) => p.basicInfo.id === "c") as BattleParticipant;

    const r = processStartOfTurn(casterP, 3, ps, rng, map);

    expect(hp(r.participants)).toBe(176);
    expect(r.damageMessages.join(" ")).toContain("влучає");
    expect(r.participant.battleData.pendingHits).toBeUndefined();

    const downed = { ...casterP, combatStats: { ...casterP.combatStats, currentHp: 0, status: CombatStatus.DEAD } };

    expect(hp(processStartOfTurn(downed, 3, ps.map((p) => (p === casterP ? downed : p)), rng, map).participants)).toBe(176);
  });
});
