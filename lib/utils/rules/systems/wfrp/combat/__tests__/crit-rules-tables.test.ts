import { describe, expect, it } from "vitest";

import { conditionLevel } from "../../conditions/levels";
import { applyWfrpCrit } from "../crit-effect";
import { rollCrit } from "../crit-table";

import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { mulberry32 } from "@/lib/utils/common/rng";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { TableRow } from "@/lib/utils/rules/tables-schema";

const rng = mulberry32(1);

const withTables = (tables: Record<string, TableRow[] | null>) => ({ ...WFRP_RULES, tables });

const campaign: TableRow[] = [
  { max: 50, text: "Cut <b>deep</b>", effects: [{ type: "damage", amount: 4 }, { type: "condition", key: "stunned", levels: 2 }, { type: "marker", key: "crippled" }] },
  { max: 100, effects: [{ type: "damage", amount: 1 }] },
];

describe("rollCrit with rules.tables", () => {
  it("campaign row: damage, condition and marker all applied", () => {
    const crit = rollCrit("head", withTables({ critHead: campaign }), rng, 10);

    expect(crit).toMatchObject({ id: "head.1", text: "Cut <b>deep</b>", bonusDamage: 4, conditions: [{ key: "stunned", levels: 2 }], markers: ["crippled"] });

    const r = applyWfrpCrit(makeParticipant({ id: "t", hp: 20, maxHp: 20 }), crit, 1);

    expect(conditionLevel(r.participant, "stunned")).toBe(2);
    expect(r.participant.battleData.activeEffects.map((e) => e.name)).toContain("crit.wfrp.head.1.crippled");
    expect(r.message).toMatchObject({ params: { text: "Cut <b>deep</b>", bonus: 4 } });
  });

  it("empty section equals the shipped defaults", () => {
    expect(rollCrit("leg", withTables({}), rng, 100)).toEqual({ id: "leg.5", text: dynamicTextRef("battleWfrp.crit.leg.5"), bonusDamage: 4, conditions: [], markers: ["crippled"] });
  });

  it("partial override leaves other slots default and null is default", () => {
    const rules = withTables({ critHead: campaign, critLeg: null });

    expect(rollCrit("arm", rules, rng, 1).text).toEqual(dynamicTextRef("battleWfrp.crit.arm.1"));
    expect(rollCrit("leg", rules, rng, 1).text).toEqual(dynamicTextRef("battleWfrp.crit.leg.1"));
  });

  it("row without text does not throw and keeps an empty text", () => {
    const crit = rollCrit("head", withTables({ critHead: campaign }), rng, 100);

    expect(crit.text).toBe("");
    expect(applyWfrpCrit(makeParticipant({ id: "t", hp: 20, maxHp: 20 }), crit, 1).message).toMatchObject({ message: "battleWfrp.log.critHit" });
  });

  it("preset 1 and 100 pick the first and the last row", () => {
    const rules = withTables({ critHead: campaign });

    expect(rollCrit("head", rules, rng, 1).id).toBe("head.1");
    expect(rollCrit("head", rules, rng, 100).id).toBe("head.2");
    expect(rollCrit("head", rules, rng, 51).id).toBe("head.2");
  });
});
