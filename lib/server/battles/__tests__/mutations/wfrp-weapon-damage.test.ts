import { describe, expect, it } from "vitest";

import { context } from "./fixtures";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { extractWfrpAttacks } from "@/lib/utils/battle/participant/extract-wfrp-attacks";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { WFRP_EQUIPMENT } from "@/lib/utils/rules/systems/wfrp/equipment";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const weaponRow = (flat: number) => ({
  row: { id: "sw", name: "Sword", slot: "weapon", systemStats: { type: "weapon", group: "basic", reach: "average", damage: { addSb: true, flat }, qualities: [], flaws: [], twoHanded: false, weight: 1, price: 1 } },
  slot: "weapon",
});

const duel = (flat: number) => {
  const [attack] = extractWfrpAttacks([weaponRow(flat)] as never, WFRP_EQUIPMENT);

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 60, s: 30, t: 30 } };

  const a = makeParticipant({ id: "a", side: ParticipantSide.ALLY, hp: 20, maxHp: 20 });

  const attacker: BattleParticipant = {
    ...a,
    basicInfo: { ...a.basicInfo, battleId: "b1", controlledBy: "dm", sourceType: ParticipantSourceType.CHARACTER },
    abilities: { ...a.abilities, level: 3, ...wfrpAbilitiesOf(characteristics) },
    battleData: { ...a.battleData, attacks: [attack] },
  };

  const t = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 30, maxHp: 30 });

  const target: BattleParticipant = { ...t, basicInfo: { ...t.basicInfo, battleId: "b1" }, abilities: { ...t.abilities, ...wfrpAbilitiesOf(characteristics) } };

  const base = context({ participants: [attacker, target], isDM: true });

  return { ctx: { ...base, meta: { ...base.meta, rules: WFRP_RULES }, rng: () => 0.05 }, attack };
};

const run = async (flat: number, serverRolls = true) => {
  const { ctx } = duel(flat);

  const body = attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 5, damageRolls: [] });

  const out = await createAttackMutation(undefined, { serverRolls })(ctx, body);

  const steps = (out.events as unknown as { details: { actionDetails: { damageSteps?: { t: { label: { message: string }; value: number }[] } } } }[])[0].details.actionDetails.damageSteps?.t ?? [];

  const weapon = steps.find((s) => s.label.message === "battleWfrp.damage.steps.weapon")?.value;

  return { out, weapon, hp: out.participants.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp ?? 0 };
};

describe("wfrp equipped weapon damage", () => {
  it("server-rolled +4 sword deals weapon step 4, not a hero die", async () => {
    const r = await run(4);

    expect(r.weapon).toBe(4);
  });

  it("manual d100 attack carries the flat too", async () => {
    expect((await run(4, false)).weapon).toBe(4);
  });

  it("flat 0 weapon still deals SB and SL minus TB", async () => {
    const r = await run(0);

    expect(r.weapon).toBe(0);
    expect(r.hp).toBeLessThan(30);
  });

  it("negative flat reduces the weapon step", async () => {
    expect((await run(-1)).weapon).toBe(-1);
  });
});
