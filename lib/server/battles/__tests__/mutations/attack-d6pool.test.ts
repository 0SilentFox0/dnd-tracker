import { describe, expect, it, vi } from "vitest";

import { context } from "./fixtures";

import { D6POOL_SYSTEM } from "@/lib/__tests__/fixtures/d6pool/definition";
import { D6POOL_SERVER } from "@/lib/__tests__/fixtures/d6pool/server";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack } from "@/types/battle";

vi.mock("@/lib/utils/rules/systems", async (importOriginal) => ({ ...(await importOriginal<object>()), ruleSystemOf: () => D6POOL_SYSTEM, ruleSystemByKey: () => D6POOL_SYSTEM }));

vi.mock("@/lib/server/systems/registry", async (importOriginal) => ({ ...(await importOriginal<object>()), systemServerOf: () => D6POOL_SERVER }));

const SPEAR: BattleAttack = { id: "s", name: "Spear", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4", damageType: "piercing" };

const ctx = () => {
  const attacker = placed("a", { side: ParticipantSide.ALLY, hp: 20, attacks: [SPEAR] });

  const target = placed("t", { side: ParticipantSide.ENEMY, hp: 20, attacks: [SPEAR] });

  const base = context({ participants: [attacker, target], isDM: true });

  return { ...base, scene: { ...base.scene, turnIndex: 0 } };
};

const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "s", d20Roll: 6, damageRolls: [2], ...over });

const hpOf = (out: { participants: { basicInfo: { id: string }; combatStats: { currentHp: number } }[] }) => out.participants.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp;

describe("attack mutation on a d6pool base, no d20 and no wfrp in the registry", () => {
  it("a hit by the system's judgement lands damage", async () => {
    expect(hpOf(await attackMutation(ctx(), body()))).toBeLessThan(20);
  });

  it("a miss by the system's judgement leaves the target alone", async () => {
    expect(hpOf(await attackMutation(ctx(), body({ d20Roll: 2 })))).toBe(20);
  });

  it("the system input of a base without its own input is dropped", async () => {
    const out = await attackMutation(ctx(), body({ system: { key: "x", data: { kind: "sl" } }, fortune: "sl", fortuneRoll: 10 }));

    expect(hpOf(out)).toBeLessThan(20);
  });
});
