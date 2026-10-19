import { describe, expect, it } from "vitest";

import { fireWaveVictims } from "../fire-wave";
import { resolveHit } from "../hit";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { calculateAttackRoll } from "@/lib/utils/battle/attack";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const MAP: BattleMapConfig = { cols: 10, rows: 10, background: null, opacity: 0.4 };

const SWORD: BattleAttack = { id: "s", name: "Молот", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "bludgeoning" };

const wave = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "fireWave", percent: 50, size: 15 }] });

const fireProof = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 }] });

const at = (id: string, pos: GridPoint | undefined, side: ParticipantSide = ParticipantSide.ENEMY, abilities: ReturnType<typeof resolved>[] = []): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 100, maxHp: 100, abilities });

  return { ...p, battleData: { ...p.battleData, attacks: [SWORD], ...(pos && { position: pos }) } };
};

const jarl = at("a", { x: 0, y: 5 }, ParticipantSide.ALLY, [wave]);

describe("fireWaveVictims", () => {
  it("конус за ціллю: ворог одразу позаду так, збоку від атакуючого ні", () => {
    const ps = [jarl, at("v", { x: 2, y: 5 }), at("behind", { x: 3, y: 5 }), at("side", { x: 0, y: 8 }), at("ally", { x: 3, y: 5 }, ParticipantSide.ALLY)];

    expect(fireWaveVictims(MAP, ps, jarl, "v", 15)).toEqual(["behind"]);
  });

  it("ворог за межею конуса не страждає", () => {
    expect(fireWaveVictims(MAP, [jarl, at("v", { x: 2, y: 5 }), at("far", { x: 8, y: 5 })], jarl, "v", 15)).toEqual([]);
  });

  it("без карти — до двох інших активних ворогів за порядком", () => {
    const ps = [at("a", undefined, ParticipantSide.ALLY, [wave]), at("v", undefined), at("e1", undefined), at("ally", undefined, ParticipantSide.ALLY), at("e2", undefined), at("e3", undefined)];

    expect(fireWaveVictims(undefined, ps, ps[0], "v", 15)).toEqual(["e1", "e2"]);
  });
});

describe("Вогняна хвиля при влучанні", () => {
  const hit = (ps: BattleParticipant[], map?: BattleMapConfig) => {
    const flow = { ps, messages: [] as string[], summons: [], ctx: { round: 1, rng: () => 0.5, ...(map && { map }) } };

    const attacker = ps[0];

    const r = resolveHit({ flow, attackerId: "a", targetId: "v", attack: SWORD, damageRolls: [6], attackRoll: calculateAttackRoll(attacker, SWORD, 15), currentRound: 1 });

    return { flow, total: r.hitDamage.totalFinalDamage };
  };

  const hpOf = (flow: { ps: BattleParticipant[] }, id: string) => flow.ps.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

  it("50% удару вогнем по ворогу позаду, повідомлення в лог", () => {
    const { flow, total } = hit([jarl, at("v", { x: 2, y: 5 }), at("behind", { x: 3, y: 5 })], MAP);

    expect(total).toBeGreaterThan(1);
    expect(hpOf(flow, "behind")).toBe(100 - Math.floor(total / 2));
    expect(flow.messages.some((m) => m.startsWith("🔥 Вогняна хвиля: behind (−"))).toBe(true);
  });

  it("імун до вогню не отримує шкоди", () => {
    const { flow } = hit([jarl, at("v", { x: 2, y: 5 }), at("behind", { x: 3, y: 5 }, ParticipantSide.ENEMY, [fireProof])], MAP);

    expect(hpOf(flow, "behind")).toBe(100);
  });
});
