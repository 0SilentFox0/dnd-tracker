import type { TableRow, TableSlot } from "@/lib/utils/rules/tables-schema";

export interface ResolvedRow extends TableRow {
  textKey?: string;
}

// verify magic tables against 5e book
export const DEFAULT_TABLES: Record<TableSlot, readonly ResolvedRow[]> = {
  critHead: [
    { max: 20, effects: [{ type: "damage", amount: 1 }], textKey: "battleWfrp.crit.head.1" },
    { max: 40, effects: [{ type: "damage", amount: 2 }, { type: "condition", key: "bleeding", levels: 1 }], textKey: "battleWfrp.crit.head.2" },
    { max: 60, effects: [{ type: "damage", amount: 2 }, { type: "condition", key: "stunned", levels: 1 }], textKey: "battleWfrp.crit.head.3" },
    { max: 80, effects: [{ type: "damage", amount: 3 }, { type: "condition", key: "stunned", levels: 1 }], textKey: "battleWfrp.crit.head.4" },
    { max: 100, effects: [{ type: "damage", amount: 5 }, { type: "condition", key: "unconscious", levels: 1 }], textKey: "battleWfrp.crit.head.5" },
  ],
  critArm: [
    { max: 20, effects: [{ type: "damage", amount: 1 }], textKey: "battleWfrp.crit.arm.1" },
    { max: 40, effects: [{ type: "damage", amount: 2 }, { type: "condition", key: "bleeding", levels: 1 }], textKey: "battleWfrp.crit.arm.2" },
    { max: 60, effects: [{ type: "damage", amount: 2 }, { type: "marker", key: "disarmed" }], textKey: "battleWfrp.crit.arm.3" },
    { max: 80, effects: [{ type: "damage", amount: 3 }, { type: "condition", key: "bleeding", levels: 1 }], textKey: "battleWfrp.crit.arm.4" },
    { max: 100, effects: [{ type: "damage", amount: 4 }, { type: "marker", key: "disarmed" }], textKey: "battleWfrp.crit.arm.5" },
  ],
  critBody: [
    { max: 20, effects: [{ type: "damage", amount: 1 }], textKey: "battleWfrp.crit.body.1" },
    { max: 40, effects: [{ type: "damage", amount: 2 }, { type: "marker", key: "winded" }], textKey: "battleWfrp.crit.body.2" },
    { max: 60, effects: [{ type: "damage", amount: 2 }, { type: "condition", key: "bleeding", levels: 1 }], textKey: "battleWfrp.crit.body.3" },
    { max: 80, effects: [{ type: "damage", amount: 3 }, { type: "condition", key: "bleeding", levels: 1 }], textKey: "battleWfrp.crit.body.4" },
    { max: 100, effects: [{ type: "damage", amount: 5 }, { type: "condition", key: "stunned", levels: 1 }], textKey: "battleWfrp.crit.body.5" },
  ],
  critLeg: [
    { max: 20, effects: [{ type: "damage", amount: 1 }], textKey: "battleWfrp.crit.leg.1" },
    { max: 40, effects: [{ type: "damage", amount: 2 }, { type: "condition", key: "bleeding", levels: 1 }], textKey: "battleWfrp.crit.leg.2" },
    { max: 60, effects: [{ type: "damage", amount: 2 }, { type: "condition", key: "prone", levels: 1 }], textKey: "battleWfrp.crit.leg.3" },
    { max: 80, effects: [{ type: "damage", amount: 3 }, { type: "condition", key: "prone", levels: 1 }], textKey: "battleWfrp.crit.leg.4" },
    { max: 100, effects: [{ type: "damage", amount: 4 }, { type: "marker", key: "crippled" }], textKey: "battleWfrp.crit.leg.5" },
  ],
  miscastMinor: [
    { max: 20, effects: [{ type: "condition", key: "fatigued", levels: 1 }], textKey: "wfrpMagic.miscast.minor.1" },
    { max: 40, effects: [{ type: "condition", key: "deafened", levels: 1 }], textKey: "wfrpMagic.miscast.minor.2" },
    { max: 60, effects: [{ type: "condition", key: "stunned", levels: 1 }], textKey: "wfrpMagic.miscast.minor.3" },
    { max: 80, effects: [{ type: "wounds", amount: 1 }], textKey: "wfrpMagic.miscast.minor.4" },
    { max: 100, effects: [{ type: "condition", key: "blinded", levels: 1 }, { type: "wounds", amount: 2 }], textKey: "wfrpMagic.miscast.minor.5" },
  ],
  miscastMajor: [
    { max: 20, effects: [{ type: "condition", key: "ablaze", levels: 1 }, { type: "wounds", amount: 2 }], textKey: "wfrpMagic.miscast.major.1" },
    { max: 40, effects: [{ type: "condition", key: "stunned", levels: 2 }], textKey: "wfrpMagic.miscast.major.2" },
    { max: 60, effects: [{ type: "condition", key: "blinded", levels: 1 }, { type: "wounds", amount: 3 }], textKey: "wfrpMagic.miscast.major.3" },
    { max: 80, effects: [{ type: "condition", key: "broken", levels: 2 }], textKey: "wfrpMagic.miscast.major.4" },
    { max: 100, effects: [{ type: "wounds", amount: 5 }], textKey: "wfrpMagic.miscast.major.5" },
  ],
  wrath: [
    { max: 25, effects: [{ type: "condition", key: "fatigued", levels: 1 }], textKey: "wfrpMagic.miscast.wrath.1" },
    { max: 50, effects: [{ type: "condition", key: "stunned", levels: 1 }], textKey: "wfrpMagic.miscast.wrath.2" },
    { max: 75, effects: [{ type: "condition", key: "deafened", levels: 1 }], textKey: "wfrpMagic.miscast.wrath.3" },
    { max: 100, effects: [{ type: "condition", key: "blinded", levels: 1 }, { type: "wounds", amount: 2 }], textKey: "wfrpMagic.miscast.wrath.4" },
  ],
};
