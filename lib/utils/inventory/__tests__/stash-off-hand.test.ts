import { describe, expect, it } from "vitest";

import { applyStashAction, StashError } from "@/lib/utils/inventory/stash-actions";
import type { StashState } from "@/types/inventory";

const state = (): StashState => ({ equipped: { shield: "buckler", weapon: "sword" }, stash: ["dagger"], items: [], purse: { gp: 0, sp: 0, cp: 0 } });

const light = { slot: "weapon", modifiers: [{ type: "traits", value: "light" }] };

const heavy = { slot: "weapon", modifiers: [{ type: "traits", value: "twoHanded" }] };

const ctx = (artifact: typeof light, classesEnabled: boolean) => ({ newItemId: "n", artifactSlotType: artifact.slot, artifact, classesEnabled });

const equip = { action: "equip", artifactId: "dagger", slot: "shield" } as const;

describe("stash equip into shield cell", () => {
  it("5e: легка зброя йде в «Щит», щит повертається в сховище", () => {
    const r = applyStashAction(state(), equip, ctx(light, true));

    expect(r.ok && r.state.equipped).toEqual({ shield: "dagger", weapon: "sword" });
    expect(r.ok && r.state.stash).toEqual(["buckler"]);
    expect(r.ok && r.log.delta).toEqual({ artifactId: "dagger", slot: "shield", swappedArtifactId: "buckler" });
  });

  it("HOMM: відмова", () => {
    expect(applyStashAction(state(), equip, ctx(light, false))).toEqual({ ok: false, error: StashError.NO_SLOT_FOR_ARTIFACT });
  });

  it("нелегка зброя: відмова", () => {
    expect(applyStashAction(state(), equip, ctx(heavy, true))).toEqual({ ok: false, error: StashError.NO_SLOT_FOR_ARTIFACT });
  });

  it("без slot — як раніше, у клітинку «Зброя»", () => {
    const r = applyStashAction(state(), { action: "equip", artifactId: "dagger" }, ctx(light, true));

    expect(r.ok && r.state.equipped.weapon).toBe("dagger");
  });
});
