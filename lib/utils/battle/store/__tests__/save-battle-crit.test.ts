import { describe, expect, it } from "vitest";

import { prepareSave } from "../save-battle";

import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";

describe("prepareSave: pending крита", () => {
  it("результат лише зі scene-патчем піднімає версію і несе pending у delta", () => {
    const c = context();

    const pendingChoice = { shown: { action: "attack" as const, actorId: "hero", triggers: [] }, hidden: { request: {}, seed: 1, userId: "u", isDM: false } };

    const { delta } = prepareSave({ ...c, scene: { ...c.scene, pendingChoice: null } }, { participants: c.participants, pending: c.pending, events: [], scene: { pendingChoice } });

    expect(delta.version).toBe(c.scene.version + 1);
    expect(delta.scene.pendingChoice).toBe(pendingChoice.shown);
    expect(delta.events).toEqual([]);
  });
});
