import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { createAddParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/add-participant/add-participant-mutation";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

function deps(over = {}) {
  return {
    loadCharacter: vi.fn(async () => ({ id: "ch1", campaignId: "c1" }) as never),
    loadUnit: vi.fn(async () => ({ id: "u1", campaignId: "c1" }) as never),
    fromCharacter: vi.fn(async () => participant("new-ch")),
    fromUnit: vi.fn(async (_u: unknown, _b: string, _s: unknown, n: number) => participant(`new-u${n}`)),
    ...over,
  };
}

describe("add-participant mutation", () => {
  it("вставляє юнітів після поточного учасника і пише подію", async () => {
    const out = await createAddParticipantMutation(deps())(context(), { sourceId: "u1", type: "unit", side: "enemy", quantity: 2 });

    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "new-u1", "new-u2", "gob"]);
    expect(out.events[0].resultText).toContain("DM додав на поле");
  });

  it("персонаж іншої кампанії — 404", async () => {
    const d = deps({ loadCharacter: vi.fn(async () => ({ id: "ch1", campaignId: "other" })) });

    await expect(
      createAddParticipantMutation(d)(context({ participants: [hero, goblin] }), { sourceId: "ch1", type: "character", side: "ally", quantity: 1 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  describe("ворог-юніт посеред бою", () => {
    const built = (id: string) => participant(id, { sourceId: "u1", side: ParticipantSide.ENEMY }, { combatStats: { ...goblin.combatStats, maxHp: 10, currentHp: 10 } });

    const scaledWolf = participant("wolf-0", { sourceId: "u1", side: ParticipantSide.ENEMY }, {
      combatStats: { ...goblin.combatStats, maxHp: 15, currentHp: 4 },
      battleData: { ...goblin.battleData, hpMultiplier: 1.5, damageMultiplier: 1.2 },
    });

    const run = (participants: BattleParticipant[], side: "enemy" | "ally" = "enemy") =>
      createAddParticipantMutation(deps({ fromUnit: vi.fn(async (_u: unknown, _b: string, _s: unknown, n: number) => built(`new-u${n}`)) }))(
        context({ participants }),
        { sourceId: "u1", type: "unit", side, quantity: 2 },
      );

    it("копіює множники наявного учасника з тим самим sourceId і масштабує HP", async () => {
      const out = await run([hero, scaledWolf]);

      const added = out.participants.filter((p) => p.basicInfo.id.startsWith("new-u"));

      expect(added).toHaveLength(2);

      for (const p of added) {
        expect(p.battleData.hpMultiplier).toBe(1.5);
        expect(p.battleData.damageMultiplier).toBe(1.2);
        expect(p.combatStats.maxHp).toBe(15);
        expect(p.combatStats.currentHp).toBe(15);
      }
    });

    it("без такого учасника лишається ×1", async () => {
      const out = await run([hero, goblin]);

      const added = out.participants.filter((p) => p.basicInfo.id.startsWith("new-u"));

      expect(added.every((p) => p.battleData.damageMultiplier === undefined && p.combatStats.maxHp === 10)).toBe(true);
    });

    it("союзні юніти не масштабуються", async () => {
      const out = await run([hero, scaledWolf], "ally");

      expect(out.participants.find((p) => p.basicInfo.id === "new-u1")?.combatStats.maxHp).toBe(10);
    });
  });
});
