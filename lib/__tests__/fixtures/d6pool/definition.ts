import type { RuleSystemDefinition } from "@/lib/utils/rules/systems";
import { defineSlot } from "@/lib/utils/rules/systems/slot";

export interface D6PoolData {
  pool: number;
}

export const D6POOL_SLOT = defineSlot<D6PoolData>("d6pool", (raw) => (raw && typeof raw === "object" && typeof (raw as D6PoolData).pool === "number" ? (raw as D6PoolData) : undefined));

export const D6POOL_SYSTEM: RuleSystemDefinition = {
  key: "d6pool",
  distance: { unit: "yd", perCell: 1 },
  progression: { levels: false, hpTerm: "wounds", maxHp: () => ({ total: 10, breakdown: [] }) },
  characteristics: {
    persisted: true,
    defaults: () => ({ pool: 3 }),
    isEmpty: (value) => value == null || (typeof value === "object" && Object.keys(value).length === 0),
    sheetBlock: (input) => (D6POOL_SLOT.read({ key: "d6pool", data: input.characteristics }) ? D6POOL_SLOT.write({ pool: 3 }) : undefined),
  },
  sheetTest: { accepts: (body) => body.kind === "test", roll: () => ({ kind: "test" }) as never },
  rest: { kinds: false },
  combat: { judge: "client", dice: 6, actionEconomy: { bonusAction: false, reaction: false } },
  conditionSet: { apply: (ps) => ({ participants: ps, messages: [], blocked: true }), effectInput: () => null },
  identity: { alignments: false },
  lineage: false,
  classes: false,
  attacks: true,
  spells: false,
  items: true,
  inventory: true,
  d20Stats: false,
};
