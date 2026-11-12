import { noActions, noReactions } from "@/lib/utils/battle/actions/none";
import { noProficiency, noSaves } from "@/lib/utils/battle/saves/none";
import { noMagic } from "@/lib/utils/battle/spell/none";
import { rollDie } from "@/lib/utils/common/dice";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems";
import { defineSlot } from "@/lib/utils/rules/systems/slot";
import type { ResolveAttackCtx, ResolvedAttack } from "@/lib/utils/rules/systems/types";

export interface D6PoolData {
  pool: number;
}

export const D6POOL_SLOT = defineSlot<D6PoolData>("d6pool", (raw) => (raw && typeof raw === "object" && typeof (raw as D6PoolData).pool === "number" ? (raw as D6PoolData) : undefined));

const d6Roll = (ctx: ResolveAttackCtx): number => ctx.manualRoll ?? rollDie(6, ctx.rng);

const d6Attack = (ctx: ResolveAttackCtx): ResolvedAttack => {
  const roll = d6Roll(ctx);

  const isHit = roll >= 4;

  return { isHit, lines: [], defenseValue: 4, attackRoll: { isHit, isCritical: false, isCriticalFail: false, totalAttackValue: roll, attackBonus: 0, advantageUsed: false, chosenD20: roll } };
};

export const D6POOL_SYSTEM: RuleSystemDefinition = {
  key: "d6pool",
  progression: { levels: false, hpTerm: "wounds", maxHp: () => ({ total: 10, breakdown: [] }) },
  characteristics: {
    persisted: true,
    defaults: () => ({ pool: 3 }),
    isEmpty: (value) => value == null || (typeof value === "object" && Object.keys(value).length === 0),
    sheetBlock: (input) => (D6POOL_SLOT.read({ key: "d6pool", data: input.characteristics }) ? D6POOL_SLOT.write({ pool: 3 }) : undefined),
  },
  sheetTest: { accepts: (body) => body.kind === "test", roll: () => ({ kind: "test" }) as never },
  rest: { kinds: false },
  combat: { judge: "client", dice: 6, actionEconomy: { bonusAction: false, reaction: false }, actions: noActions, reactions: noReactions, saves: noSaves, proficiency: noProficiency, resolveAttack: d6Attack, damage: () => ({ doubleDice: false }), onZeroHp: (ctx) => ({ participant: ctx.after, participants: ctx.participants, messages: [] }), abortedRoll: (ctx) => ({ ...d6Attack({ ...ctx, manualRoll: ctx.manualRoll ?? 1 }).attackRoll, isHit: false }),
    initiative: (p, ctx) => {
      if (ctx.rules.initiative.mode !== "roll") return { total: p.abilities.baseInitiative, roll: null, die: null };

      const roll = rollDie(6, ctx.rng);

      return { total: p.abilities.baseInitiative + roll, roll, die: 6 };
    },
    tieBreak: (p) => p.abilities.initiativeBonus ?? 0,
    hitModel: { offense: () => 4, defense: () => 4, winChance: () => 0.5, damage: () => 3, refHit: 0.5 },
  },
  conditionSet: { apply: (ps) => ({ participants: ps, messages: [], blocked: true }), effectInput: () => null },
  magic: noMagic,
  identity: { alignments: false },
  lineage: false,
  classes: false,
  attacks: true,
  spells: false,
  items: true,
  inventory: true,
  d20Stats: false,
};
