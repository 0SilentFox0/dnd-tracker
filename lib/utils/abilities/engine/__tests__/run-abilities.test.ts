import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/run-abilities";

const ctx = { round: 1, rng: seq(0) };

const hit = { type: "hit" as const, actorId: "a", targetId: "e", attackKind: "melee" as const, damage: 6 };

describe("runAbilities", () => {
  it("спрацьовує вміння цілі (role target)", () => {
    const thorns = resolved({ trigger: { event: "hit", role: "target" }, effects: [{ kind: "dealDamage", amount: 2, target: "eventActor" }] });

    const a = makeParticipant({ id: "a" });

    const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, abilities: [thorns] });

    const r = runAbilities([a, e], hit, ctx);

    expect(r.participants[0].combatStats.currentHp).toBe(18);
    expect(r.fired).toEqual([thorns.key]);
  });

  it("perBattle блокує друге спрацювання; невдалий chance ліміт не витрачає", () => {
    const once = resolved({ trigger: { event: "hit", role: "attacker" }, limits: { perBattle: 1, chance: 50 }, effects: [{ kind: "changeMorale", delta: 1 }] });

    let ps = [makeParticipant({ id: "a", abilities: [once] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    ps = runAbilities(ps, hit, { round: 1, rng: seq(0.9) }).participants;
    expect(ps[0].combatStats.morale).toBe(0);
    ps = runAbilities(ps, hit, { round: 1, rng: seq(0.1) }).participants;
    expect(ps[0].combatStats.morale).toBe(1);
    ps = runAbilities(ps, hit, { round: 1, rng: seq(0.1) }).participants;
    expect(ps[0].combatStats.morale).toBe(1);
  });

  it("perRound скидається на roundStart, perTurn — на turnStart власника", () => {
    const ab = resolved({ trigger: { event: "hit", role: "attacker" }, limits: { perRound: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

    let ps = [makeParticipant({ id: "a", abilities: [ab] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    ps = runAbilities(ps, hit, ctx).participants;
    ps = runAbilities(ps, hit, ctx).participants;
    expect(ps[0].combatStats.morale).toBe(1);
    ps = runAbilities(ps, { type: "roundStart" }, ctx).participants;
    ps = runAbilities(ps, hit, ctx).participants;
    expect(ps[0].combatStats.morale).toBe(2);
  });

  it("умова перевіряється на поточному стані", () => {
    const ab = resolved({ trigger: { event: "turnStart" }, condition: { type: "hpBelow", who: "self", percent: 50 }, effects: [{ kind: "heal", amount: 5 }] });

    const ps = [makeParticipant({ id: "a", hp: 15, abilities: [ab] })];

    expect(runAbilities(ps, { type: "turnStart", actorId: "a" }, ctx).participants[0].combatStats.currentHp).toBe(15);
    ps[0] = makeParticipant({ id: "a", hp: 8, abilities: [ab] });
    expect(runAbilities(ps, { type: "turnStart", actorId: "a" }, ctx).participants[0].combatStats.currentHp).toBe(13);
  });

  it("смерть від вміння дає один kill і не каскадить далі", () => {
    const bolt = resolved({ trigger: { event: "roundStart" }, effects: [{ kind: "dealDamage", amount: 50, target: "allEnemies" }] });

    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] }, { id: "m" });

    const glory = resolved({ trigger: { event: "kill", role: "killer" }, effects: [{ kind: "dealDamage", amount: 50, target: "allEnemies" }] }, { id: "g" });

    const ps = [
      makeParticipant({ id: "e2", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100, abilities: [mourn] }),
      makeParticipant({ id: "a", abilities: [bolt, glory] }),
      makeParticipant({ id: "e1", side: ParticipantSide.ENEMY }),
    ];

    const r = runAbilities(ps, { type: "roundStart" }, ctx);

    expect(r.participants[2].combatStats.status).toBe("unconscious");
    expect(r.participants[0].combatStats.morale).toBe(-1);
    // glory спрацював на глибині 1, тож його смерть від dealDamage вже не породжує kill
    expect(r.participants[0].combatStats).toMatchObject({ currentHp: 0, status: "unconscious", morale: -1 });
  });

  it("bonusAction виконує лише обране вміння", () => {
    const a1 = resolved({ id: "x", trigger: { event: "bonusAction" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const a2 = resolved({ id: "y", trigger: { event: "bonusAction" }, effects: [{ kind: "changeMorale", delta: -1 }] });

    const ps = [makeParticipant({ id: "a", abilities: [a1, a2] })];

    const r = runAbilities(ps, { type: "bonusAction", actorId: "a", abilityKey: a2.key }, ctx);

    expect(r.participants[0].combatStats.morale).toBe(-1);
  });

  it("before-фаза повертає actionModifiers по учасниках", () => {
    const aim = resolved({ trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" }, effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }] });

    const ps = [makeParticipant({ id: "a", abilities: [aim] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    const r = runAbilities(ps, { type: "attack", phase: "before", actorId: "a", targetId: "e", attackKind: "ranged" }, ctx);

    expect(r.actionModifiers.a).toEqual([{ kind: "flag", flag: "advantage", attackKind: "ranged" }]);
  });
});

describe("resolveDowned", () => {
  it("lethalDamage рятує з 1 HP; інакше kill", () => {
    const survive = resolved({ trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] });

    const down = makeParticipant({ id: "v", abilities: [survive] });

    const victim = { ...down, combatStats: { ...down.combatStats, currentHp: -3, status: "dead" as const } };

    const r1 = resolveDowned([victim], { victimId: "v", actorId: null }, ctx);

    expect(r1.survived).toBe(true);
    expect(r1.participants[0].combatStats).toMatchObject({ currentHp: 1, status: "active" });

    const again = { ...r1.participants[0], combatStats: { ...r1.participants[0].combatStats, currentHp: 0, status: "unconscious" as const } };

    expect(resolveDowned([again], { victimId: "v", actorId: null }, ctx).survived).toBe(false);
  });
});
