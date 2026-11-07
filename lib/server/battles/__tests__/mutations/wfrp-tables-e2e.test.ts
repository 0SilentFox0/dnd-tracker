import { describe, expect, it, vi } from "vitest";

import { context } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { stripPlayerHiddenRules } from "@/lib/utils/rules/player-hidden";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { conditionLevel } from "@/lib/utils/rules/systems/wfrp/conditions/levels";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import { must } from "@/lib/utils/rules/systems/wfrp/traits/__tests__/fixtures";
import type { TableRow } from "@/lib/utils/rules/tables-schema";
import type { BattleParticipant } from "@/types/battle";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

const fighter = (id: string, side: ParticipantSide): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 30, maxHp: 30 });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, s: 30, t: 30, wp: 35 } };

  return {
    ...p,
    basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" },
    abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { ap: { head: 0, arm: 0, body: 0, leg: 0 } }) },
    battleData: { ...p.battleData, attacks: [{ id: "sw", name: "Sword", type: "melee", attackBonus: 0, damageDice: "1d6", damageType: "slashing" } as never] },
  };
};

const CAMPAIGN_ROW: TableRow[] = [{ max: 100, text: "Cut <b>deep</b>", effects: [{ type: "damage", amount: 5 }, { type: "condition", key: "stunned", levels: 2 }, { type: "marker", key: "crippled" }] }];

const run = async (rules: typeof WFRP_RULES) => {
  const base = context({ participants: [fighter("h", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

  const ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules }, scene: { ...base.scene, turnIndex: 0 }, rng: () => 0.5 };

  return attackMutation(ctx, attackBodySchema.parse({ attackerId: "h", targetId: "t", attackId: "sw", d20Roll: 11, damageRolls: [4], endTurn: false }));
};

describe("wfrp rules.tables end to end", () => {
  it("campaign critArm row applies damage, condition and marker and logs its text", async () => {
    const out = await run({ ...WFRP_RULES, tables: { critArm: CAMPAIGN_ROW } });

    const target = must(out.participants.find((p) => p.basicInfo.id === "t"));

    expect(JSON.stringify(out.events)).toContain("Cut <b>deep</b>");
    expect(conditionLevel(target, "stunned")).toBe(2);
    expect(target.battleData.activeEffects.map((e) => e.name)).toContain("crit.wfrp.arm.1.crippled");
  });

  it("empty tables keep the shipped crit", async () => {
    const out = await run(WFRP_RULES);

    expect(JSON.stringify(out.events)).toContain("battleWfrp.crit.arm.");
    expect(JSON.stringify(out.events)).not.toContain("Cut <b>deep</b>");
  });

  it("players get the rules without tables", () => {
    expect(stripPlayerHiddenRules({ ...WFRP_RULES, tables: { critArm: CAMPAIGN_ROW } }).tables).toEqual({});
  });
});
