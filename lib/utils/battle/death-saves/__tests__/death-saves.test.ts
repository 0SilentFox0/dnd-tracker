import { describe, expect, it, vi } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { applyRawDamage, applyRawHeal } from "@/lib/utils/abilities/engine/effects/hp";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { beginConcentration } from "@/lib/utils/battle/concentration";
import { hasCondition } from "@/lib/utils/battle/conditions";
import { applyDamageConsequences, settleStatusChange } from "@/lib/utils/battle/damage/consequences";
import { clearDeathSaves, deathSaveDamage, rollDeathSave, startDying } from "@/lib/utils/battle/death-saves";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const on: Ruleset = { ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true } };

const rollOf = (n: number) => () => (n - 1) / 20 + 0.001;

const hero = (over: Partial<BattleParticipant["combatStats"]> = {}, id = "hero") => {
  const base = createMockParticipant();

  return createMockParticipant({ basicInfo: { ...base.basicInfo, id }, combatStats: { ...base.combatStats, ...over } });
};

const hit = (before: BattleParticipant, amount: number, crit = false, rules: Ruleset = on) =>
  applyDamageConsequences({ before, after: applyRawDamage(before, amount), amount, crit, rules, rng: () => 0.5, participants: [before] });

const dying = (id = "hero") => startDying(hero({ currentHp: 0 }, id), on);

describe("startDying", () => {
  it("sets unconscious state and zeroed counters", () => {
    const p = dying();

    expect(p.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(hasCondition(p, "unconscious")).toBe(true);
    expect(p.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
  });
});

describe("damage consequences", () => {
  it("hero dropping to 0 becomes unconscious and starts saves", () => {
    const r = hit(hero({ currentHp: 5 }), 7);

    expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(r.participant.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
    expect(hasCondition(r.participant, "unconscious")).toBe(true);
  });

  it("massive damage kills outright at exactly maxHp overflow", () => {
    expect(hit(hero({ currentHp: 5 }), 25).participant.combatStats.status).toBe(CombatStatus.DEAD);
    expect(hit(hero({ currentHp: 5 }), 24).participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
  });

  it("damage at 0 HP adds a failure, crit adds two, three kill, and it breaks stability", () => {
    const one = hit(dying(), 3);

    expect(one.participant.battleData.deathSaves?.failures).toBe(1);

    const crit = hit(dying(), 3, true);

    expect(crit.participant.battleData.deathSaves?.failures).toBe(2);

    const stable = { ...dying(), battleData: { ...dying().battleData, deathSaves: { successes: 3, failures: 0, stable: true } } };

    expect(hit(stable, 1).participant.battleData.deathSaves?.stable).toBe(false);

    const twice = hit(hit(dying(), 3).participant, 3, true);

    expect(twice.participant.combatStats.status).toBe(CombatStatus.DEAD);
  });

  it("does nothing special when the rule is off", () => {
    const r = hit(hero({ currentHp: 5 }), 7, false, DEFAULT_RULES);

    expect(r.participant.battleData.deathSaves).toBeUndefined();
    expect(hasCondition(r.participant, "unconscious")).toBe(false);
  });
});

describe("rollDeathSave", () => {
  it("10 succeeds, 9 fails, 1 fails twice", () => {
    expect(rollDeathSave(dying(), rollOf(10)).participant.battleData.deathSaves).toMatchObject({ successes: 1, failures: 0 });
    expect(rollDeathSave(dying(), rollOf(9)).participant.battleData.deathSaves).toMatchObject({ successes: 0, failures: 1 });
    expect(rollDeathSave(dying(), rollOf(1)).participant.battleData.deathSaves).toMatchObject({ failures: 2 });
  });

  it("20 revives with 1 HP and clears the state", () => {
    const { participant } = rollDeathSave(dying(), rollOf(20));

    expect(participant.combatStats).toMatchObject({ currentHp: 1, status: CombatStatus.ACTIVE });
    expect(participant.battleData.deathSaves).toBeUndefined();
    expect(hasCondition(participant, "unconscious")).toBe(false);
  });

  it("three successes stabilize and further rolls are no-ops", () => {
    let p = dying();

    for (let i = 0; i < 3; i++) p = rollDeathSave(p, rollOf(12)).participant;

    expect(p.battleData.deathSaves).toMatchObject({ successes: 0, failures: 0, stable: true });

    const rng = vi.fn(() => 0.5);

    expect(rollDeathSave(p, rng).participant).toBe(p);
    expect(rng).not.toHaveBeenCalled();
  });

  it("three failures kill", () => {
    const p = rollDeathSave(deathSaveDamage(dying(), true), rollOf(2)).participant;

    expect(p.combatStats.status).toBe(CombatStatus.DEAD);
  });
});

describe("healing", () => {
  it("raw heal wakes a dying hero", () => {
    const { participant } = applyRawHeal(dying(), 4);

    expect(participant.combatStats).toMatchObject({ currentHp: 4, status: CombatStatus.ACTIVE });
    expect(participant.battleData.deathSaves).toBeUndefined();
    expect(hasCondition(participant, "unconscious")).toBe(false);
  });

  it("clearDeathSaves removes state and counters", () => {
    const p = clearDeathSaves(dying());

    expect(p.battleData.deathSaves).toBeUndefined();
    expect(p.battleData.activeEffects).toHaveLength(0);
  });
});

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null,
};

const gob = () => {
  const base = createMockParticipant();

  return createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" } });
};

describe("advanceTurn with death saves", () => {
  it("rolls for a dying hero between current and next", () => {
    const order = [hero({}, "a"), dying("b"), gob()];

    const out = advanceTurn({ participants: order, pending: [], scene, rules: on, rng: rollOf(15) });

    expect(out.scene.turnIndex).toBe(2);
    expect(out.participants[1].battleData.deathSaves?.successes).toBe(1);
    expect(out.actions.some((a) => eventTextOf(a).includes("кидок смерті"))).toBe(true);
  });

  it("stable hero does not roll", () => {
    const b = dying("b");

    const stable = { ...b, battleData: { ...b.battleData, deathSaves: { successes: 3, failures: 0, stable: true } } };

    const rng = vi.fn(() => 0.5);

    advanceTurn({ participants: [hero({}, "a"), stable, gob()], pending: [], scene, rules: on, rng });

    expect(rng).not.toHaveBeenCalled();
  });

  it("does not roll when the rule is off", () => {
    const rng = vi.fn(() => 0.5);

    const out = advanceTurn({ participants: [hero({}, "a"), dying("b"), gob()], pending: [], scene, rules: DEFAULT_RULES, rng });

    expect(out.participants[1].battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
  });

  it("hero revived by a 20 acts on that very turn", () => {
    const out = advanceTurn({ participants: [hero({}, "a"), dying("b"), gob()], pending: [], scene, rules: on, rng: rollOf(20) });

    expect(out.participants[1].combatStats.status).toBe(CombatStatus.ACTIVE);
    expect(out.scene.turnIndex).toBe(1);
  });
});

describe("advanceTurn round wrap with a 20", () => {
  it("hero revived at the start of a new round acts first", () => {
    const out = advanceTurn({ participants: [dying("b"), gob(), hero({}, "a")], pending: [], scene: { ...scene, turnIndex: 2 }, rules: on, rng: rollOf(20) });

    const acting = out.participants[out.scene.turnIndex ?? 0];

    expect(out.scene.round).toBe(2);
    expect(acting.basicInfo.id).toBe("b");
    expect(acting.combatStats.status).toBe(CombatStatus.ACTIVE);
  });
});

describe("victory", () => {
  it("all heroes down with death saves count as defeated", () => {
    const r = checkVictoryConditions([dying("a"), dying("b"), gob()]);

    expect(r.result).toBe("defeat");
  });
});

describe("review fixes", () => {
  const withSaves = (p: BattleParticipant, deathSaves: NonNullable<BattleParticipant["battleData"]["deathSaves"]>): BattleParticipant => ({ ...p, battleData: { ...p.battleData, deathSaves } });

  it("stabilising resets both counters, so later damage starts from one failure", () => {
    let p = withSaves(dying(), { successes: 2, failures: 2, stable: false });

    p = rollDeathSave(p, rollOf(12)).participant;

    expect(p.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: true });

    const hurt = hit(p, 1).participant;

    expect(hurt.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(hurt.battleData.deathSaves).toEqual({ successes: 0, failures: 1, stable: false });
  });

  it("damage of at least max HP to a hero at 0 HP kills outright", () => {
    expect(hit(dying(), 20).participant.combatStats.status).toBe(CombatStatus.DEAD);
    expect(hit(dying(), 19).participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
  });

  const settle = (before: BattleParticipant, after: BattleParticipant, rules: Ruleset = on) => settleStatusChange(before, after, [after], rules);

  it("DM heal of a dying hero clears death saves and the unconscious effect", () => {
    const before = dying();

    const after = { ...before, combatStats: { ...before.combatStats, currentHp: 5, status: CombatStatus.ACTIVE } };

    const r = settle(before, after).participant;

    expect(r.battleData.deathSaves).toBeUndefined();
    expect(hasCondition(r, "unconscious")).toBe(false);
  });

  it("DM setting a hero to 0 HP starts dying", () => {
    const before = hero({ currentHp: 8 });

    const after = { ...before, combatStats: { ...before.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };

    const r = settle(before, after).participant;

    expect(r.battleData.deathSaves).toEqual({ successes: 0, failures: 0, stable: false });
    expect(hasCondition(r, "unconscious")).toBe(true);
    expect(settle(before, after, DEFAULT_RULES).participant.battleData.deathSaves).toBeUndefined();
  });

  it("DM kill drops the caster's concentration", () => {
    const base = hero({ currentHp: 8 });

    const [c] = beginConcentration([base], "hero", "hero:sp@1#0", "Щит", 3).participants;

    const dead = { ...c, combatStats: { ...c.combatStats, currentHp: 0, status: CombatStatus.DEAD } };

    const rules: Ruleset = { ...on, concentration: { enabled: true, dcCap: null } };

    const r = settleStatusChange(c, dead, [dead], rules);

    expect(r.participant.battleData.activeEffects.some((e) => e.concentration)).toBe(false);
    expect(textsOf(r.messages).join(" ")).toContain("втрачає концентрацію");
  });
});
