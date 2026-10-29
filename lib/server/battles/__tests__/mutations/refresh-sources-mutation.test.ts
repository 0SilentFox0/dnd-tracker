import { describe, expect, it, vi } from "vitest";

import { context, participant } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { createRefreshSourcesMutation } from "@/lib/server/battles/mutations/refresh-sources/refresh-sources-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { toReserve } from "@/lib/utils/battle/participant/reserve";

const fresh = (id: string) => {
  const p = participant(id);

  return { ...p, battleData: { ...p.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects: [] }, { id: "fresh" })] } };
};

function deps(over = {}) {
  return {
    loadCharacter: vi.fn(async (id: string) => (id === "gone" ? null : ({ id, campaignId: "c1" } as never))),
    loadUnit: vi.fn(async (id: string) => (id === "gone" ? null : ({ id, campaignId: "c1" } as never))),
    fromCharacter: vi.fn(async () => fresh("x")),
    fromUnit: vi.fn(async () => fresh("x")),
    ...over,
  };
}

const hero = participant("hero", { sourceType: "character", sourceId: "ch1" });

const gob = participant("gob", { sourceType: "unit", sourceId: "u1", side: ParticipantSide.ENEMY, instanceNumber: 1 });

const gob2 = participant("gob2", { sourceType: "unit", sourceId: "u1", side: ParticipantSide.ENEMY, instanceNumber: 2 });

describe("refresh-sources mutation", () => {
  it("refreshes characters, units and reserve; loads each source once", async () => {
    const d = deps();

    const out = await createRefreshSourcesMutation(d)(context({ participants: [hero, gob, gob2], pending: [toReserve(participant("res", { sourceType: "unit", sourceId: "u1" }))] }));

    expect(d.loadUnit).toHaveBeenCalledTimes(1);
    expect(d.fromUnit).toHaveBeenCalledTimes(3);
    expect(out.participants.every((p) => p.battleData.resolvedAbilities[0]?.source.id === "fresh")).toBe(true);
    expect(out.pending[0].battleData.reserved).toBe(true);
    expect(out.pending[0].battleData.resolvedAbilities[0]?.source.id).toBe("fresh");
    expect(eventTextOf(out.events[0])).toBe("Оновлено з бібліотеки: 4 учасників");
  });

  it("skips missing sources, extra-turn slots, summons and other campaigns", async () => {
    const d = deps({ loadUnit: vi.fn(async (id: string) => (id === "other" ? ({ id, campaignId: "c2" } as never) : null)) });

    const missing = participant("m", { sourceType: "unit", sourceId: "gone" });

    const foreign = participant("f", { sourceType: "unit", sourceId: "other" });

    const slot = participant("s", { sourceType: "character", sourceId: "ch1", isExtraTurnSlot: true });

    const base = participant("sum", { sourceType: "unit", sourceId: "u1" });

    const summon = { ...base, battleData: { ...base.battleData, summonedBy: "hero" } };

    const out = await createRefreshSourcesMutation(d)(context({ participants: [hero, missing, foreign, slot, summon] }));

    expect(eventTextOf(out.events[0])).toBe("Оновлено з бібліотеки: 1 учасників");
    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "m", "f", "s", "sum"]);
    expect(out.participants[1]).toBe(missing);
  });
});
