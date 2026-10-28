import { describe, expect, it } from "vitest";

import { prepareSave } from "../save-battle";

import { context } from "@/app/api/__tests__/battles/fixtures";

describe("prepareSave: pending крита", () => {
  it("результат лише зі scene-патчем піднімає версію і несе pending у delta", () => {
    const c = context();

    const pendingCritChoice = { action: "attack" as const, actorId: "hero", triggers: [], request: {}, seed: 1, userId: "u", isDM: false };

    const { delta } = prepareSave({ ...c, scene: { ...c.scene, pendingCritChoice: null } }, { participants: c.participants, pending: c.pending, events: [], scene: { pendingCritChoice } });

    expect(delta.version).toBe(c.scene.version + 1);
    expect(delta.scene.pendingCritChoice).toBe(pendingCritChoice);
    expect(delta.events).toEqual([]);
  });
});
