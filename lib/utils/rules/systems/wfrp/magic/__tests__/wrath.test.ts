import { describe, expect, it } from "vitest";

import { WFRP_MAGIC } from "../index";
import { WRATH_TABLE } from "../miscast-table";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { mulberry32 } from "@/lib/utils/common/rng";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

describe("wrath", () => {
  it("rolls the wrath table and logs the row text", () => {
    const caster = makeParticipant({ id: "c", hp: 20, maxHp: 20 });

    const preset = WRATH_TABLE[1].max;

    const r = WFRP_MAGIC.miscast([caster], "c", "wrath", { round: 1, rng: mulberry32(1), rules: WFRP_RULES, applyDamage: applyDamageConsequences, presetRoll: preset });

    expect(r.messages[0]).toMatchObject({ message: "wfrpMagic.log.wrath", params: { effect: { message: "wfrpMagic.miscast.wrath.2" } } });
  });
});
