import { grimData } from "./pack-helpers";

import { ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { createUnitSchema } from "@/lib/schemas/units";
import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { coerceRecord, IMPORT_SPECS } from "@/lib/utils/content/import";
import { mergeRules } from "@/lib/utils/rules/schema";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";
import { woundsMax } from "@/systems/wfrp/rules/characteristics/derive";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { planDraft } from "@/systems/wfrp/rules/creation/plan";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import { must } from "@/systems/wfrp/rules/traits/__tests__/fixtures";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export const data = grimData();

const merged = mergeRules(WFRP_RULES, (data.rules ?? {}) as Parameters<typeof mergeRules>[1]);

if (!merged.ok) throw new Error("rules patch invalid");

export const rules = merged.rules;

export const SWORD = { id: "sw", name: "Sword", type: "melee", attackBonus: 0, damageDice: "1d6", damageType: "slashing" } as BattleAttack;

export const PASS = 0.01;

export const NO_WARD: [number, number] = [0.95, 0.05];

export const HIT = 5;

export const MISS = 98;

const careerIds = new Set(data.careers.map((c) => String(c.name)));

const featIds = new Set(data.feats.map((f) => String(f.name)));

export const rowOf = (name: string) => must(data.units.find((u) => u.name === name), name);

export function unitOf(name: string): UnitFromPrisma {
  const { value } = coerceRecord(rowOf(name), IMPORT_SPECS.units.fields);

  const body = createUnitSchema.parse(IMPORT_SPECS.units.toBody ? IMPORT_SPECS.units.toBody(value, "create") : value);

  return { ...unitCreateData("c1", body), id: name.toLowerCase().replace(/[^a-z]+/g, "-"), createdAt: new Date(0), updatedAt: new Date(0) } as unknown as UnitFromPrisma;
}

export async function buildUnit(name: string, id: string): Promise<BattleParticipant> {
  const p = await createBattleParticipantFromUnit(unitOf(name), "b1", ParticipantSide.ENEMY, 1, undefined, rules);

  return { ...p, basicInfo: { ...p.basicInfo, id, controlledBy: "dm" } };
}

export function heroes(): BattleParticipant[] {
  return data.raceProfiles.map(({ profile }, i) => {
    const plan = planDraft({ career: { mode: "choice", careerId: profile.careerTable[0].careerId }, stats: { mode: "free", points: Array(10).fill(rules.advancement.creation.freeBudget / 10) }, talents: [] }, { profile, rules: rules.advancement, careerIds, featIds });

    if (!plan.ok) throw new Error(plan.errors.join(","));

    const hp = woundsMax(plan.characteristics);

    const p = makeParticipant({ id: `h${i}`, side: ParticipantSide.ALLY, hp, maxHp: hp });

    return { ...p, basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" }, abilities: { ...p.abilities, ...wfrpAbilitiesOf(plan.characteristics, { ap: { head: 0, arm: 0, body: 0, leg: 0 } }) }, battleData: { ...p.battleData, attacks: [SWORD] } };
  });
}

export const ctxOf = (participants: BattleParticipant[]): BattleMutationContext => {
  const base = context({ participants, isDM: true });

  return { ...base, meta: { ...base.meta, rules } };
};

export const firstThen = (first: number, rest: number) => {
  let calls = 0;

  return () => (calls++ === 0 ? first : rest);
};

export const part = (ctx: BattleMutationContext, id: string) => must(ctx.participants.find((p) => p.basicInfo.id === id), id);

export const standing = (p: BattleParticipant) => p.combatStats.currentHp > 0;

export const meleeOf = (p: BattleParticipant) => must(p.battleData.attacks.find((a) => a.type === "melee"), `${p.basicInfo.name} melee`);

export async function strike(ctx: BattleMutationContext, attackerId: string, targetId: string, attackId: string, roll: number, rng: [number, number] = NO_WARD, endTurn = false) {
  const turnIndex = ctx.participants.findIndex((p) => p.basicInfo.id === attackerId);

  const ready: BattleMutationContext = { ...ctx, participants: ctx.participants.map((p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } })), scene: { ...ctx.scene, turnIndex } };

  const out = await attackMutation({ ...ready, rng: firstThen(...rng) }, attackBodySchema.parse({ attackerId, targetId, attackId, d20Roll: roll, damageRolls: [4], endTurn }));

  const next: BattleMutationContext = { ...ready, participants: out.participants, pending: out.pending ?? ready.pending, scene: { ...ready.scene, ...out.scene } };

  return { out, next };
}
