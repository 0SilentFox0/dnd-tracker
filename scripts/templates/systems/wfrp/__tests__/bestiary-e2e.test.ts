import { describe, expect, it, vi } from "vitest";

import { buildUnit, ctxOf, data, heroes, HIT, meleeOf, MISS, NO_WARD, part, PASS, rules, standing, strike } from "./grim-e2e-helpers";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runJoinTriggers } from "@/lib/utils/battle/turn/join-triggers";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { ATTACK_SLOT } from "@/systems/wfrp/rules/slots";
import { must } from "@/systems/wfrp/rules/traits/__tests__/fixtures";

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: vi.fn() } } }));

const E2E_UNITS = ["Oathbound Revenant", "Lantern Wraith", "Many-Mouthed Thing", "Cinder Drake"];

describe("grim bestiary end to end", () => {
  it("every template unit builds a participant with its traits baked in", async () => {
    for (const row of data.units) {
      const p = await buildUnit(String(row.name), "u");

      const c = row.characteristics as { base: Record<string, number> };

      expect(p.combatStats, String(row.name)).toMatchObject({ maxHp: row.maxHp, speed: row.speed, gridSize: row.gridSize });
      expect(p.abilities.initiative, String(row.name)).toBe(row.initiative);
      expect(p.abilities.characteristics?.base, String(row.name)).toEqual(c.base);
      expect(p.battleData.attacks.length, String(row.name)).toBeGreaterThan(0);
      expect(p.battleData.attacks.every((a) => !!a.system), String(row.name)).toBe(true);
    }
  });

  it("armour, ward, size, magical and breath reach the participants", async () => {
    const [revenant, wraith, mouths, drake] = await Promise.all(E2E_UNITS.map((name, i) => buildUnit(name, `u${i}`)));

    expect(revenant.abilities.wfrp?.ap).toEqual({ head: 3, body: 3, arm: 3, leg: 3 });
    expect(wraith.abilities.wfrp?.ward).toBe(9);
    expect(ATTACK_SLOT.read(must(wraith.battleData.attacks.find((a) => a.name === "Grave Touch +6")).system)?.magical).toBe(true);
    expect(mouths.abilities.wfrp?.size).toBe("large");
    expect(mouths.battleData.resolvedAbilities.some((a) => a.trigger.event === "turnStart")).toBe(true);
    expect(drake.abilities.wfrp).toMatchObject({ size: "enormous", ap: { head: 4, body: 4, arm: 4, leg: 4 } });
    expect(must(drake.battleData.attacks.find((a) => a.name === "Breath +9"))).toMatchObject({ type: "ranged", range: "36 ft", targetType: "aoe", blastRadius: 2 });
    expect(ATTACK_SLOT.read(must(drake.battleData.attacks.find((a) => a.name === "Breath +9")).system)?.noSb).toBe(true);
  });

  it("template heroes test Terror on join, take hits and beat four template units with healing between strikes", async () => {
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

    const allies = (c: BattleMutationContext) => c.participants.filter((p) => p.basicInfo.side === ParticipantSide.ALLY);

    const healed = (c: BattleMutationContext): BattleMutationContext => ({ ...c, participants: c.participants.map((p) => (p.basicInfo.side === ParticipantSide.ALLY ? { ...p, combatStats: { ...p.combatStats, currentHp: p.combatStats.maxHp, status: CombatStatus.ACTIVE } } : p)) });

    const STRIKE_CAP = 600;

    let strikes = 0;

    let hpLost = 0;

    while (strikes < STRIKE_CAP && enemyStanding(ctx).length > 0) {
      const { next } = await strike(ctx, party[strikes % party.length].basicInfo.id, enemyStanding(ctx)[0].basicInfo.id, "sw", HIT);

      hpLost += allies(next).reduce((sum, p) => sum + p.combatStats.maxHp - p.combatStats.currentHp, 0);
      ctx = healed(next);
      strikes++;
    }

    expect(strikes).toBeLessThan(STRIKE_CAP);
    expect(hpLost).toBeGreaterThan(0);

    for (const foe of foes) {
      expect(part(ctx, foe.basicInfo.id).combatStats.currentHp, foe.basicInfo.name).toBe(0);
      expect(part(ctx, foe.basicInfo.id).combatStats.status, foe.basicInfo.name).not.toBe(CombatStatus.ACTIVE);
    }

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
