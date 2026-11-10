import { describe, expect, it, vi } from "vitest";

import { readGrimData } from "../data";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { createUnitSchema } from "@/lib/schemas/units";
import { context } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant/from-unit";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runJoinTriggers } from "@/lib/utils/battle/turn/join-triggers";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { coerceRecord, IMPORT_SPECS } from "@/lib/utils/content/import";
import { mergeRules } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { woundsMax } from "@/lib/utils/rules/systems/wfrp/characteristics/derive";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { planDraft } from "@/lib/utils/rules/systems/wfrp/creation/plan";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import { must } from "@/lib/utils/rules/systems/wfrp/traits/__tests__/fixtures";
import { unitCreateData } from "@/lib/utils/units/unit-create-data";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

const data = readGrimData();

const merged = mergeRules(WFRP_RULES, (data.rules ?? {}) as Parameters<typeof mergeRules>[1]);

if (!merged.ok) throw new Error("rules patch invalid");

const rules = merged.rules;

const SWORD = { id: "sw", name: "Sword", type: "melee", attackBonus: 0, damageDice: "1d6", damageType: "slashing" } as BattleAttack;

const PASS = 0.01;

const NO_WARD: [number, number] = [0.95, 0.05];

const HIT = 5;

const MISS = 98;

const E2E_UNITS = ["Oathbound Revenant", "Lantern Wraith", "Many-Mouthed Thing", "Cinder Drake"];

const careerIds = new Set(data.careers.map((c) => String(c.name)));

const featIds = new Set(data.feats.map((f) => String(f.name)));

const rowOf = (name: string) => must(data.units.find((u) => u.name === name), name);

function unitOf(name: string): UnitFromPrisma {
  const { value } = coerceRecord(rowOf(name), IMPORT_SPECS.units.fields);

  const body = createUnitSchema.parse(IMPORT_SPECS.units.toBody ? IMPORT_SPECS.units.toBody(value, "create") : value);

  return { ...unitCreateData("c1", body), id: name.toLowerCase().replace(/[^a-z]+/g, "-"), createdAt: new Date(0), updatedAt: new Date(0) } as unknown as UnitFromPrisma;
}

async function buildUnit(name: string, id: string): Promise<BattleParticipant> {
  const p = await createBattleParticipantFromUnit(unitOf(name), "b1", ParticipantSide.ENEMY, 1, undefined, rules);

  return { ...p, basicInfo: { ...p.basicInfo, id, controlledBy: "dm" } };
}

function heroes(): BattleParticipant[] {
  return data.raceProfiles.map(({ profile }, i) => {
    const plan = planDraft({ career: { mode: "choice", careerId: profile.careerTable[0].careerId }, stats: { mode: "free", points: Array(10).fill(rules.advancement.creation.freeBudget / 10) }, talents: [] }, { profile, rules: rules.advancement, careerIds, featIds });

    if (!plan.ok) throw new Error(plan.errors.join(","));

    const hp = woundsMax(plan.characteristics);

    const p = makeParticipant({ id: `h${i}`, side: ParticipantSide.ALLY, hp, maxHp: hp });

    return { ...p, basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" }, abilities: { ...p.abilities, ...wfrpAbilitiesOf(plan.characteristics, { ap: { head: 0, arm: 0, body: 0, leg: 0 } }) }, battleData: { ...p.battleData, attacks: [SWORD] } };
  });
}

const ctxOf = (participants: BattleParticipant[]): BattleMutationContext => {
  const base = context({ participants, isDM: true });

  return { ...base, meta: { ...base.meta, rules } };
};

const firstThen = (first: number, rest: number) => {
  let calls = 0;

  return () => (calls++ === 0 ? first : rest);
};

const part = (ctx: BattleMutationContext, id: string) => must(ctx.participants.find((p) => p.basicInfo.id === id), id);

const standing = (p: BattleParticipant) => p.combatStats.currentHp > 0;

const meleeOf = (p: BattleParticipant) => must(p.battleData.attacks.find((a) => a.type === "melee"), `${p.basicInfo.name} melee`);

async function strike(ctx: BattleMutationContext, attackerId: string, targetId: string, attackId: string, roll: number, rng: [number, number] = NO_WARD, endTurn = false) {
  const turnIndex = ctx.participants.findIndex((p) => p.basicInfo.id === attackerId);

  const ready: BattleMutationContext = { ...ctx, participants: ctx.participants.map((p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedAction: false } })), scene: { ...ctx.scene, turnIndex } };

  const out = await attackMutation({ ...ready, rng: firstThen(...rng) }, attackBodySchema.parse({ attackerId, targetId, attackId, d20Roll: roll, damageRolls: [4], endTurn }));

  const next: BattleMutationContext = { ...ready, participants: out.participants, pending: out.pending ?? ready.pending, scene: { ...ready.scene, ...out.scene } };

  return { out, next };
}

describe("grim bestiary end to end", () => {
  it("every template unit builds a participant with its traits baked in", async () => {
    for (const row of data.units) {
      const p = await buildUnit(String(row.name), "u");

      const c = row.characteristics as { base: Record<string, number> };

      expect(p.combatStats, String(row.name)).toMatchObject({ maxHp: row.maxHp, speed: row.speed, gridSize: row.gridSize });
      expect(p.abilities.initiative, String(row.name)).toBe(row.initiative);
      expect(p.abilities.characteristics?.base, String(row.name)).toEqual(c.base);
      expect(p.battleData.attacks.length, String(row.name)).toBeGreaterThan(0);
      expect(p.battleData.attacks.every((a) => !!a.wfrp), String(row.name)).toBe(true);
    }
  });

  it("armour, ward, size, magical and breath reach the participants", async () => {
    const [revenant, wraith, mouths, drake] = await Promise.all(E2E_UNITS.map((name, i) => buildUnit(name, `u${i}`)));

    expect(revenant.abilities.wfrp?.ap).toEqual({ head: 3, body: 3, arm: 3, leg: 3 });
    expect(wraith.abilities.wfrp?.ward).toBe(9);
    expect(must(wraith.battleData.attacks.find((a) => a.name === "Grave Touch +6")).wfrp?.magical).toBe(true);
    expect(mouths.abilities.wfrp?.size).toBe("large");
    expect(mouths.battleData.resolvedAbilities.some((a) => a.trigger.event === "turnStart")).toBe(true);
    expect(drake.abilities.wfrp).toMatchObject({ size: "enormous", ap: { head: 4, body: 4, arm: 4, leg: 4 } });
    expect(must(drake.battleData.attacks.find((a) => a.name === "Breath +9"))).toMatchObject({ type: "ranged", range: "36 ft", targetType: "aoe", wfrp: { blastRadius: 2, noSb: true } });
  });

  it("template heroes test Terror on join, take hits and beat four template units", async () => {
    const party = heroes();

    const foes = await Promise.all(E2E_UNITS.map((name, i) => buildUnit(name, `u${i}`)));

    const joined = runJoinTriggers([...party, ...foes], { round: 1, rng: () => PASS, map: null, rules });

    expect(joined.psychology.targets.map((t) => t.participantId).sort()).toEqual(party.map((h) => h.basicInfo.id).sort());

    for (const h of party) {
      const tested = must(joined.participants.find((p) => p.basicInfo.id === h.basicInfo.id));

      expect(tested.battleData.psychologyTested).toEqual({ terror: 2, fear: 2 });
      expect(ruleSystemOf(rules).conditions?.list(tested) ?? []).not.toContainEqual(expect.objectContaining({ key: "broken" }));
    }

    let ctx = ctxOf(joined.participants);

    for (const foe of foes) {
      const { out, next } = await strike(ctx, foe.basicInfo.id, "h0", must(meleeOf(foe).id), HIT);

      expect(part(next, "h0").combatStats.currentHp, foe.basicInfo.name).toBeLessThan(party[0].combatStats.maxHp);

      if (foe.abilities.wfrp?.size === "large" || foe.abilities.wfrp?.size === "enormous") expect(JSON.stringify(out.events)).toContain("steps.size");

      ctx = { ...next, participants: next.participants.map((p) => (p.basicInfo.id === "h0" ? party[0] : p)) };
    }

    const enemyStanding = (c: BattleMutationContext) => c.participants.filter((p) => p.basicInfo.side === ParticipantSide.ENEMY && standing(p));

    const healed = (c: BattleMutationContext): BattleMutationContext => ({ ...c, participants: c.participants.map((p) => (p.basicInfo.side === ParticipantSide.ALLY ? { ...p, combatStats: { ...p.combatStats, currentHp: p.combatStats.maxHp, status: CombatStatus.ACTIVE } } : p)) });

    for (let i = 0; i < 600 && enemyStanding(ctx).length > 0; i++) ctx = healed((await strike(ctx, party[i % party.length].basicInfo.id, enemyStanding(ctx)[0].basicInfo.id, "sw", HIT)).next);

    for (const foe of foes) {
      expect(part(ctx, foe.basicInfo.id).combatStats.currentHp, foe.basicInfo.name).toBe(0);
      expect(part(ctx, foe.basicInfo.id).combatStats.status, foe.basicInfo.name).not.toBe(CombatStatus.ACTIVE);
    }

    expect(party.every((h) => standing(part(ctx, h.basicInfo.id)))).toBe(true);
  });

  it("the Many-Mouthed Thing regenerates at the start of its turn", async () => {
    const [hero] = heroes();

    const mouths = await buildUnit("Many-Mouthed Thing", "u0");

    const ctx = ctxOf([hero, { ...mouths, combatStats: { ...mouths.combatStats, currentHp: 10 } }]);

    const { out, next } = await strike(ctx, "h0", "u0", "sw", MISS, NO_WARD, true);

    expect(next.scene.turnIndex).toBe(1);
    expect(part(next, "u0").combatStats.currentHp).toBe(11);
    expect(JSON.stringify(out.events)).toContain("abilityText.log.heal");
  });
});
