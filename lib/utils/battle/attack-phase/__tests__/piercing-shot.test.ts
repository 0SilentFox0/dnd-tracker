import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const MAP: BattleMapConfig = { cols: 10, rows: 10, background: null, opacity: 0.4 };

const bow: BattleAttack = { id: "b", name: "Посох", type: AttackType.RANGED, attackBonus: 20, damageDice: "1d6", damageType: "lightning" };

const piercing = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "piercingShot" }] });

const at = (id: string, pos: GridPoint, side: ParticipantSide = ParticipantSide.ENEMY, abilities: ReturnType<typeof resolved>[] = []): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 50, maxHp: 50, abilities });

  return { ...p, battleData: { ...p.battleData, attacks: [bow], position: pos } };
};

const run = (order: BattleParticipant[], map: BattleMapConfig | null) =>
  runAttackPhase({ battle: { initiativeOrder: order, battleLog: [], currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", targetId: "t", attackRoll: 15, damageRolls: [4, 4, 4, 4, 4, 4] }, battleId: "b", userId: "u", isDM: true, rng: seq(0.5), map });

const hpOf = (r: ReturnType<typeof run>, id: string) => r.finalInitiativeOrder.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

describe("Наскрізний постріл", () => {
  it("б'є всіх ворогів на лінії без падіння шкоди, інших не чіпає", () => {
    const order = [at("a", { x: 0, y: 5 }, ParticipantSide.ALLY, [piercing]), at("t", { x: 3, y: 5 }), at("b", { x: 6, y: 5 }), at("off", { x: 6, y: 8 })];

    const r = run(order, MAP);

    expect(r.allBattleActions.filter((e) => e.actionType === "attack")).toHaveLength(2);
    expect(hpOf(r, "t")).toBeLessThan(50);
    expect(hpOf(r, "b")).toBe(hpOf(r, "t"));
    expect(hpOf(r, "off")).toBe(50);
  });

  it("без прапорця б'є лише ціль, без карти — теж", () => {
    const plain = [at("a", { x: 0, y: 5 }, ParticipantSide.ALLY), at("t", { x: 3, y: 5 }), at("b", { x: 6, y: 5 })];

    expect(hpOf(run(plain, MAP), "b")).toBe(50);

    const withFlag = [at("a", { x: 0, y: 5 }, ParticipantSide.ALLY, [piercing]), at("t", { x: 3, y: 5 }), at("b", { x: 6, y: 5 })];

    expect(hpOf(run(withFlag, null), "b")).toBe(50);
  });
});
