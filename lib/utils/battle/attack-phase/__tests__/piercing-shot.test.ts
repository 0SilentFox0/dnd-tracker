import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { piercingShot } from "@/data/library/unit-abilities";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const MAP = testMap();

const bow: BattleAttack = { id: "b", name: "Посох", type: AttackType.RANGED, attackBonus: 20, damageDice: "1d6", damageType: "lightning" };

const piercing = resolved(piercingShot());

const at = (id: string, pos: GridPoint, side: ParticipantSide = ParticipantSide.ENEMY, abilities: ReturnType<typeof resolved>[] = []) => placed(id, { side, at: pos, hp: 50, abilities, attacks: [bow] });

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
