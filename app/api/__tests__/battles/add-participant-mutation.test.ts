import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero, participant } from "./fixtures";

import { createAddParticipantMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/add-participant/add-participant-mutation";

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
});
