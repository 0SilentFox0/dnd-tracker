import { describe, expect, it } from "vitest";

import { toBookSpell } from "@/lib/utils/spells/to-book-spell";

const row = {
  id: "s", name: "Мітка", level: 1, type: "target", damageType: "damage", diceCount: 1, diceType: "d6", savingThrow: null, hitCheck: null,
  description: null, icon: null, range: "27 м", duration: null, concentration: true, damageElement: null, spellGroup: { id: "g", name: "Віщування" },
};

describe("toBookSpell", () => {
  it("коректний рядок проходить як є", () => {
    expect(toBookSpell({ ...row, savingThrow: { ability: "dex", onSuccess: "half" } })).toMatchObject({ id: "s", savingThrow: { ability: "dex", onSuccess: "half" }, spellGroup: { name: "Віщування" } });
  });

  it("зіпсований JSON рятівного кидка чи атаки — null, а не сміття в UI", () => {
    const out = toBookSpell({ ...row, savingThrow: "dex", hitCheck: { dc: 12 } });

    expect(out.savingThrow).toBeNull();
    expect(out.hitCheck).toBeNull();
  });

  it("невідомий тип заклинання — target, невідомий тип шкоди — damage", () => {
    expect(toBookSpell({ ...row, type: "weird", damageType: "x" })).toMatchObject({ type: "target", damageType: "damage" });
  });
});
