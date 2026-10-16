import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { auraZoneMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/aura-zone/aura-zone-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { BattleAccessError } from "@/lib/utils/battle/store";

const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 1, target: "nearbyAllies" }] }, { id: "unit-allies-aura-attackBonus" });

const owner = { ...hero, battleData: { ...hero.battleData, resolvedAbilities: [aura] } };

const auraId = `${aura.key}:nearbyAllies`;

describe("aura-zone mutation", () => {
  it("накладає зону на обраних союзників і пише подію", () => {
    const out = auraZoneMutation(context({ participants: [owner, goblin] }), { participantId: "hero", auraId, targetIds: ["hero"] });

    expect(out.participants[0].battleData.activeEffects.map((e) => e.zone?.ownerId)).toEqual(["hero"]);
    expect(out.events[0].resultText).toContain("у зоні");
  });

  it("ворог у зоні союзників — відмова; не свій хід — 403", () => {
    expect(() => auraZoneMutation(context({ participants: [owner, goblin] }), { participantId: "hero", auraId, targetIds: ["gob"] })).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(() => auraZoneMutation(context({ participants: [owner, goblin], scene: { ...context().scene, turnIndex: 1 } }), { participantId: "hero", auraId, targetIds: [] })).toThrow(BattleAccessError);
  });
});
