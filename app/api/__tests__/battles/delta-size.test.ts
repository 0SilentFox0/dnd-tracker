import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { AttackType } from "@/lib/constants/battle";
import type { PipelineDeps, RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { prepareSave } from "@/lib/utils/battle/store";
import type { BattleMutationResponse } from "@/types/api";

const DELTA_BUDGET_BYTES = 2_048;

const armedHero = {
  ...hero,
  battleData: { ...hero.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] },
};

const sturdyGoblin = { ...goblin, combatStats: { ...goblin.combatStats, maxHp: 100, currentHp: 100 } };

function deps(): PipelineDeps {
  const ctx = context({ participants: [armedHero, sturdyGoblin] });

  return {
    getUserId: async () => "user-1",
    rateLimit: vi.fn(),
    loadBattle: async () => ({ scene: ctx.scene, meta: ctx.meta, participants: ctx.participants, pending: [], isDM: false, isMember: true }),
    saveBattle: async (before, outcome) => prepareSave(before, outcome).delta,
    publish: vi.fn(),
    loadRecentEvents: async () => [],
  };
}

async function deltaBytes<T>(options: Omit<RunBattleMutationOptions<T>, "params">, body: unknown) {
  const res = await runBattleMutation(
    new Request("http://x/api", { method: "POST", body: JSON.stringify(body) }),
    { ...options, params: { id: "c1", battleId: "b1" } } as RunBattleMutationOptions<T>,
    deps(),
  );

  const { delta } = (await res.json()) as BattleMutationResponse;

  return { delta, bytes: Buffer.byteLength(JSON.stringify(delta), "utf8") };
}

describe("розмір дельти бою", () => {
  it("атака героя — лише патчі учасників і дельта < 2 KB", async () => {
    const { delta, bytes } = await deltaBytes(
      { access: "member", schema: attackBodySchema, mutate: attackMutation },
      { attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 15, damageRolls: [8] },
    );

    expect(delta.upserted).toEqual([]);
    expect(delta.patched?.map((p) => p.id).sort()).toEqual(["gob", "hero"]);
    expect(bytes).toBeLessThan(DELTA_BUDGET_BYTES);
  });

  it("наступний хід — дельта < 2 KB", async () => {
    const { bytes } = await deltaBytes(
      { access: "currentController", mutate: nextTurnMutation },
      {},
    );

    expect(bytes).toBeLessThan(DELTA_BUDGET_BYTES);
  });
});
