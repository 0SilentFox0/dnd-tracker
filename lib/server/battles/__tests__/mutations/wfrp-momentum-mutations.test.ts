import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { coreActionMutation } from "@/lib/server/battles/mutations/core-action/core-action-mutation";
import { legendaryMutation } from "@/lib/server/battles/mutations/core-action/legendary-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BattleParticipant, SceneMomentum } from "@/types/battle";

const sword = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" } as const;

const fighter = (id: string, side: ParticipantSide, extra: Partial<BattleParticipant["battleData"]> = {}): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 40, maxHp: 40 });

  return {
    ...p,
    basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" },
    abilities: { ...p.abilities, characteristics: { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } } },
    battleData: { ...p.battleData, attacks: [sword], ...extra },
  };
};

const byCall = (...values: number[]) => {
  let i = 0;

  return () => values[i++] ?? 0.5;
};

const boss = () => fighter("boss", ParticipantSide.ENEMY, { legendary: { actions: 3, actionsLeft: 3, resistLeft: 0 } });

const wfrpCtx = (momentum: SceneMomentum, rng: () => number): BattleMutationContext => {
  const base = context({ participants: [boss(), fighter("a", ParticipantSide.ALLY)], isDM: true, userId: "dm" });

  return { ...base, rng, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 1, momentum } };
};

const body = { action: "legendary" as const, participantId: "boss", option: { kind: "attack" as const, attackIndex: 0, targetId: "a" } };

describe("legendary mutation momentum", () => {
  it("writes the token to the scene when it changes", async () => {
    const out = await legendaryMutation(wfrpCtx({}, byCall(0.295, 0.795)), body);

    expect(out.scene?.momentum).toEqual({ enemy: true });
  });

  it("omits scene when the value is unchanged", async () => {
    const out = await legendaryMutation(wfrpCtx({ enemy: true }, byCall(0.295, 0.795)), body);

    expect(out.scene).toBeUndefined();
  });

  it("d20 battles never emit scene.momentum", async () => {
    const d20 = fighter("boss", ParticipantSide.ENEMY, { legendary: { actions: 3, actionsLeft: 3, resistLeft: 0 } });

    const out = await legendaryMutation(context({ participants: [hero, { ...goblin, ...d20, basicInfo: { ...goblin.basicInfo, id: "boss", controlledBy: "dm" } }], isDM: true, userId: "dm", rng: () => 0.5 }), { ...body, option: { ...body.option, targetId: "hero" } });

    expect(out.scene?.momentum).toBeUndefined();
  });
});

describe("core-action mutation momentum", () => {
  it("d20 readied attacks never emit scene.momentum", () => {
    const base = context({ participants: [{ ...hero, battleData: { ...hero.battleData, attacks: [sword], readied: { kind: "attack", round: 1 } } }, goblin], isDM: true, userId: "dm" });

    const ctx = { ...base, meta: { ...base.meta, rules: { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true } } } };

    const out = coreActionMutation(ctx, { action: "readiedAttack", participantId: "hero", targetId: "gob" });

    expect(out.events.length).toBeGreaterThan(0);
    expect(out.scene?.momentum).toBeUndefined();
  });
});
