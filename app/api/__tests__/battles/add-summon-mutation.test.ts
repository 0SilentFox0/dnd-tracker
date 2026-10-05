import { describe, expect, it } from "vitest";

import { context } from "./fixtures";

import { addSummonMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/add-summon/add-summon-mutation";

describe("add-summon mutation", () => {
  it("додає саммона в pending і пише подію", () => {
    const out = addSummonMutation(context(), { name: "Вовк", side: "ally", maxHp: 11, armorClass: 13, initiative: 12 });

    expect(out.pending).toHaveLength(1);
    expect(out.pending[0]).toMatchObject({ basicInfo: { name: "Вовк", controlledBy: "dm" }, combatStats: { maxHp: 11, armorClass: 13 } });
    expect(out.events[0].resultText).toContain("Призовано істоту: Вовк");
  });
});
