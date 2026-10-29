import { describe, expect, it } from "vitest";

import { SpellEffectSchema } from "@/lib/utils/spells/model/schema";

const damage = (delayIfBeyond: object) => ({ kind: "dealDamage", amount: { spellRoll: 100 }, delayIfBeyond });

describe("dealDamage.delayIfBeyond", () => {
  it("лише feet — помилка validation.spellDelayPair на perRoundFeet", () => {
    const r = SpellEffectSchema.safeParse(damage({ feet: 30 }));

    expect(r.success).toBe(false);

    const issue = r.error?.issues.find((i) => i.path.join(".") === "delayIfBeyond.perRoundFeet");

    expect(issue?.message).toBe("validation.spellDelayPair");
  });

  it("обидва поля — ок", () => {
    expect(SpellEffectSchema.safeParse(damage({ feet: 30, perRoundFeet: 10 })).success).toBe(true);
  });
});
