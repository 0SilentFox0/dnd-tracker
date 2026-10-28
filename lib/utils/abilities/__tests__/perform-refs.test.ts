import { describe, expect, it } from "vitest";

import { validateAbilities } from "@/lib/utils/abilities/editor";

const ability = { id: "pounce", name: "Pounce", trigger: { event: "action" }, limits: { legendaryCost: 1 }, perform: { kind: "attack", attack: "rEND" }, effects: [{ kind: "note", text: "Move" }] };

describe("perform editor references", () => {
  it("resolves attack names without case sensitivity and names a broken ref", () => {
    expect(validateAbilities([ability], { attacks: [{ name: "Rend" }] } as never).ok).toBe(true);
    expect(validateAbilities([ability], { attacks: [{ name: "Bite" }] } as never).errorsByPath["0.perform.attack"]).toBeDefined();
  });

  it("reports a spell reference missing from the library", () => {
    const spell = { ...ability, perform: { kind: "spell", spellId: "fear" } };

    expect(validateAbilities([spell], { spellIds: ["fear"] } as never).ok).toBe(true);
    expect(validateAbilities([spell], { spellIds: [] } as never).errorsByPath["0.perform.spellId"]).toBeDefined();
  });
});
