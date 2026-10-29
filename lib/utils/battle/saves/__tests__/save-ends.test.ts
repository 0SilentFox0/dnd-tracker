import { describe, expect, it } from "vitest";

import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { rollSaveEnds } from "@/lib/utils/battle/saves/save-ends";
import type { BattleParticipant } from "@/types/battle";

const holder = (...ids: string[]): BattleParticipant => {
  const p = makeParticipant({ id: "t" });

  return { ...p, battleData: { ...p.battleData, activeEffects: ids.map((id) => makeEffect(id, { name: id, saveEnds: { ability: "wisdom", dc: 14 } })) } };
};

describe("rollSaveEnds", () => {
  it("успіх знімає стан", () => {
    const p = holder("paralyzed");

    const r = rollSaveEnds(p, [p], undefined, seq(0.7));

    expect(r.participant.battleData.activeEffects).toHaveLength(0);
    expect(textsOf(r.messages)[0]).toContain("звільняється від стану");
  });

  it("провал лишає стан", () => {
    const p = holder("paralyzed");

    const r = rollSaveEnds(p, [p], undefined, seq(0.1));

    expect(r.participant.battleData.activeEffects).toHaveLength(1);
    expect(textsOf(r.messages)[0]).toContain("лишається");
  });

  it("кожен ефект — окремий кидок", () => {
    const p = holder("a", "b");

    const r = rollSaveEnds(p, [p], undefined, seq(0.7, 0.1));

    expect(r.participant.battleData.activeEffects.map((e) => e.id)).toEqual(["b"]);
    expect(textsOf(r.messages)).toHaveLength(2);
  });

  it("без saveEnds rng не чіпається", () => {
    const p = makeParticipant({ id: "t" });

    const rng = () => {
      throw new Error("rng used");
    };

    expect(rollSaveEnds(p, [p], undefined, rng)).toEqual({ participant: p, messages: [] });
  });
});
