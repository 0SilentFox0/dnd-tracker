import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { battleLimit, recordUse, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";

const ability = resolved({ trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "note", text: "x" }] } as never);

describe("limits.perRest у бою", () => {
  it("uses: 1 — друге використання заблоковане", () => {
    const p = makeParticipant({ id: "a", abilities: [ability] });

    expect(withinCountLimits(p, ability)).toBe(true);

    expect(withinCountLimits(recordUse(p, ability.key, 1), ability)).toBe(false);
  });

  it("battleLimit: perBattle має перевагу, інакше uses", () => {
    expect(battleLimit({ perBattle: 2, perRest: { rest: "long", uses: 3 } })).toBe(2);
    expect(battleLimit({ perRest: { rest: "long", uses: 3 } })).toBe(3);
    expect(battleLimit({ perRound: 1 })).toBeUndefined();
  });
});
