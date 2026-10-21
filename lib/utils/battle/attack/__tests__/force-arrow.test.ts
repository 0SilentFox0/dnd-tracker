import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { processAttack } from "@/lib/utils/battle/attack/process";

const bow = { id: "bow", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing" };

const forceArrow = resolved({
  name: "Стріла сили",
  trigger: { event: "hit", role: "attacker", attackKind: "ranged" },
  effects: [{ kind: "dealDamage", amount: { percentOf: "eventDamage", value: 50 }, damageType: "piercing", target: "otherEnemy" }],
});

describe("Стріла сили", () => {
  it("влучання дальньою атакою б'є ще одного ворога на 50 % завданої шкоди", () => {
    const base = makeParticipant({ id: "archer", abilities: [forceArrow] });

    const archer = { ...base, battleData: { ...base.battleData, attacks: [bow] } };

    const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

    const behind = makeParticipant({ id: "b", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

    const r = processAttack({ attacker: archer, target, attack: bow, d20Roll: 15, damageRolls: [8], allParticipants: [archer, target, behind], currentRound: 1, battleId: "b1", rng: seq(0) });

    const hp = (id: string) => r.allParticipantsUpdated?.find((p) => p.basicInfo.id === id)?.combatStats.currentHp ?? 0;

    const dealt = 100 - hp("t");

    expect(dealt).toBeGreaterThan(0);
    expect(100 - hp("b")).toBe(Math.floor(dealt / 2));
  });

  const setup = (opts: { enemies: ReturnType<typeof makeParticipant>[]; map?: ReturnType<typeof testMap> }) => {
    const base = makeParticipant({ id: "archer", abilities: [forceArrow] });

    const archer = { ...base, battleData: { ...base.battleData, attacks: [bow], position: opts.map ? { x: 0, y: 5 } : undefined } };

    const [target, ...rest] = opts.enemies;

    const r = processAttack({ attacker: archer, target, attack: bow, d20Roll: 15, damageRolls: [8], allParticipants: [archer, ...opts.enemies], currentRound: 1, battleId: "b1", rng: seq(0), map: opts.map });

    const hp = (id: string) => r.allParticipantsUpdated?.find((p) => p.basicInfo.id === id)?.combatStats.currentHp ?? 0;

    return { hp, rest };
  };

  const enemy = (id: string, battleData: Record<string, unknown> = {}) => {
    const p = makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

    return { ...p, battleData: { ...p.battleData, ...battleData } };
  };

  it("на карті бонусна шкода йде в найближчого до цілі ворога", () => {
    const { hp } = setup({
      map: testMap(),
      enemies: [enemy("t", { position: { x: 3, y: 5 } }), enemy("far", { position: { x: 9, y: 9 } }), enemy("near", { position: { x: 4, y: 5 } })],
    });

    expect(hp("near")).toBeLessThan(100);
    expect(hp("far")).toBe(100);
  });

  it("ціль загинула від влучання — бонус іде в найближчого, а не першого за ініціативою", () => {
    const dying = { ...enemy("t", { position: { x: 3, y: 5 } }), combatStats: { ...enemy("t").combatStats, currentHp: 1 } };

    const { hp } = setup({ map: testMap(), enemies: [dying, enemy("far", { position: { x: 9, y: 9 } }), enemy("near", { position: { x: 4, y: 5 } })] });

    expect(hp("near")).toBeLessThan(100);
    expect(hp("far")).toBe(100);
  });

  it("без карти дрімаючий ворог пропускається", () => {
    const { hp } = setup({ enemies: [enemy("t"), enemy("sleeper", { dormant: true }), enemy("next")] });

    expect(hp("sleeper")).toBe(100);
    expect(hp("next")).toBeLessThan(100);
  });
});
