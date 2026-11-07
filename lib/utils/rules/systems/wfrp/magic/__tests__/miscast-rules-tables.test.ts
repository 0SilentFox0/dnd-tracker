import { describe, expect, it } from "vitest";

import { conditionLevel } from "../../conditions/levels";
import { wfrpMiscast } from "../miscast";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { mulberry32 } from "@/lib/utils/common/rng";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { TableRow } from "@/lib/utils/rules/tables-schema";

const rng = mulberry32(1);

const row: TableRow[] = [{ max: 100, text: "Sparks <i>fly</i>", effects: [{ type: "wounds", amount: 3 }, { type: "condition", key: "stunned", levels: 1 }] }];

const run = (kind: "minor" | "major" | "wrath", tables: Record<string, TableRow[] | null>, presetRoll = 1) => {
  const caster = makeParticipant({ id: "c", hp: 20, maxHp: 20 });

  return wfrpMiscast([caster], "c", kind, { round: 1, rng, rules: { ...WFRP_RULES, tables }, applyDamage: applyDamageConsequences, presetRoll });
};

describe("wfrpMiscast with rules.tables", () => {
  it("minor campaign row applies wounds and condition and logs its text", () => {
    const r = run("minor", { miscastMinor: row });

    expect(r.participants[0].combatStats.currentHp).toBe(17);
    expect(conditionLevel(r.participants[0], "stunned")).toBeGreaterThan(0);
    expect(r.messages[0]).toMatchObject({ message: "wfrpMagic.log.miscast", params: { effect: "Sparks <i>fly</i>" } });
  });

  it("wrath reads its own slot", () => {
    const r = run("wrath", { wrath: row });

    expect(r.participants[0].combatStats.currentHp).toBe(17);
    expect(r.messages[0]).toMatchObject({ message: "wfrpMagic.log.wrath" });
  });

  it("an override of minor leaves major default", () => {
    const r = run("major", { miscastMinor: row, miscastMajor: null });

    expect(r.messages[0]).toMatchObject({ params: { effect: { message: "wfrpMagic.miscast.major.1" } } });
  });

  it("row without text does not throw", () => {
    const r = run("minor", { miscastMinor: [{ max: 100, effects: [{ type: "wounds", amount: 1 }] }] }, 100);

    expect(r.participants[0].combatStats.currentHp).toBe(19);
  });
});
