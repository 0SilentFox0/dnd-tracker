import { describe, expect, it } from "vitest";

import { LIBRARY_ARTIFACT_SETS } from "@/data/library/artifacts";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectModifiers, findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { Ability } from "@/lib/utils/abilities/schema";
import { splitGuardedDamage } from "@/lib/utils/battle/attack/process/guard";
import { runAttackPhase } from "@/lib/utils/battle/attack-phase/run-attack-phase";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

function abilitiesOf(setKey: string): { pieces: Record<string, Ability[]>; set: Ability[] } {
  const found = LIBRARY_ARTIFACT_SETS.find((s) => s.key === setKey);

  if (!found) throw new Error(`unknown set ${setKey}`);

  return { pieces: Object.fromEntries(found.artifacts.map((a) => [a.key, a.abilities ?? []])), set: found.abilities };
}

const asArtifact = (list: Ability[]) => list.map((a) => resolved(a, { type: "artifact" }));

const foe = (id: string, hp = 50, maxHp = 50) => makeParticipant({ id, side: ParticipantSide.ENEMY, hp, maxHp });

const withFlags = (p: BattleParticipant, flags: Partial<BattleParticipant["actionFlags"]>): BattleParticipant => ({ ...p, actionFlags: { ...p.actionFlags, ...flags } });

const ctx = { round: 1, rng: seq(0) };

describe("Мрія лучника", () => {
  const { pieces, set } = abilitiesOf("set-archers-dream");

  const bow = asArtifact(pieces["unicorn-horn-bow"]);

  const shot: BattleAttack = { id: "bw", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing" };

  it("лук: maxTargets 2, кожна ціль має окремі кидки", () => {
    const baked = bakePassives(makeParticipant({ id: "ivan", abilities: bow }));

    expect(baked.combatStats.maxTargets).toBe(2);

    const attacker = { ...baked, battleData: { ...baked.battleData, attacks: [shot] } };

    const r = runAttackPhase({
      battle: { initiativeOrder: [attacker, foe("t1"), foe("t2")], battleLog: [], currentRound: 1, currentTurnIndex: 0 },
      data: { attackerId: "ivan", targetIds: ["t1", "t2"], attackRolls: [15, 2], damageRolls: [4, 4] } as never,
      battleId: "b",
      userId: "u",
      isDM: true,
      rng: seq(0.5),
    });

    const attacks = r.allBattleActions.filter((e) => e.actionType === "attack");

    expect(attacks.map((e) => e.actionDetails.isHit)).toEqual([true, false]);
  });

  it("сагайдак: вбивство повертає бонусну дію раз за раунд", () => {
    const ivan = withFlags(makeParticipant({ id: "ivan", abilities: asArtifact(pieces["treeborn-quiver"]) }), { hasUsedBonusAction: true });

    const kill = { type: "kill", actorId: "ivan", targetId: "e" } as const;

    const first = runAbilities([ivan, foe("e")], kill, ctx);

    expect(first.participants[0].actionFlags.hasUsedBonusAction).toBe(false);

    const used = [withFlags(first.participants[0], { hasUsedBonusAction: true }), first.participants[1]];

    const second = runAbilities(used, kill, ctx);

    expect(second.participants[0].actionFlags.hasUsedBonusAction).toBe(true);
  });

  it("перстень: +15 % лише по цілі з повним HP", () => {
    const ivan = makeParticipant({ id: "ivan", abilities: asArtifact(pieces["ring-of-celerity"]) });

    const bonus = (target: BattleParticipant) => {
      const ps = [ivan, target];

      const run = runAbilities(ps, { type: "attack", phase: "before", actorId: "ivan", targetId: "e", attackKind: AttackType.MELEE }, ctx);

      return collectModifiers(run.participants, "ivan", { damage: { kind: "melee", targetId: "e" } }, run.actionModifiers.ivan).percent;
    };

    expect(bonus(foe("e", 50, 50))).toBe(15);
    expect(bonus(foe("e", 25, 50))).toBe(0);
  });

  describe("сет «Здобич»", () => {
    const ivan = makeParticipant({ id: "ivan", abilities: asArtifact(set) });

    const hit = { type: "hit", actorId: "ivan", targetId: "e", attackKind: AttackType.RANGED, damage: 5 } as const;

    const before = (ps: BattleParticipant[], targetId = "e") => {
      const run = runAbilities(ps, { type: "attack", phase: "before", actorId: "ivan", targetId, attackKind: AttackType.RANGED }, ctx);

      return collectModifiers(run.participants, "ivan", { damage: { kind: "ranged", targetId } }, run.actionModifiers.ivan).percent;
    };

    it("дальнє влучання ставить мітку, бонус 15 % не стакається", () => {
      let ps = [ivan, foe("e"), foe("other")];

      expect(before(ps)).toBe(0);

      for (let i = 0; i < 3; i++) ps = runAbilities(ps, hit, ctx).participants;

      expect(ps[1].battleData.activeEffects.length).toBeGreaterThan(0);
      expect(before(ps)).toBe(15);
      expect(before(ps, "other")).toBe(0);
    });
  });
});

describe("Обладунки гномських королів", () => {
  const { pieces, set } = abilitiesOf("set-dwarven-kings");

  const semgrun = (list: Ability[], hp?: number) => makeParticipant({ id: "semgrun", abilities: asArtifact(list), hp, maxHp: 40 });

  const ally = makeParticipant({ id: "a" });

  const hitSemgrun = { type: "hit", actorId: "e", targetId: "semgrun", attackKind: AttackType.MELEE, damage: 5 } as const;

  it("шолом: союзники імунні до Сліпоти й Сповільнення", () => {
    const ps = [semgrun(pieces["helm-of-the-dwarven-kings"]), ally, foe("e")];

    expect(participantImmuneToSpell(ps[1], "blindness", ps)).toBe(true);
    expect(participantImmuneToSpell(ps[1], "slow", ps)).toBe(true);
    expect(participantImmuneToSpell(ps[1], "roots", ps)).toBe(false);
  });

  it("кіраса: кривдник отримує перевагу для атакуючих", () => {
    const ps = [semgrun(pieces["cuirass-of-the-dwarven-kings"]), ally, foe("e")];

    const r = runAbilities(ps, hitSemgrun, ctx);

    expect(findFlags(r.participants, "e", "advantageForAttackers").length).toBeGreaterThan(0);
  });

  it("щит: союзники під вартою Семгрун", () => {
    const ps = [semgrun(pieces["shield-of-the-dwarven-kings"]), ally, foe("e")];

    const r = runAbilities(ps, { type: "battleStart" }, ctx);

    const effect = r.participants[1].battleData.activeEffects.find((e) => e.abilityKey === "guard");

    expect(effect?.source?.participantId).toBe("semgrun");
    expect(splitGuardedDamage(r.participants, "a", 10).guardianId).toBe("semgrun");
  });

  it("поножі: смертельний удар раз за бій", () => {
    const ps = [semgrun(pieces["greaves-of-the-dwarven-kings"], 0), ally, foe("e")];

    const lethal = { type: "lethalDamage", actorId: "e", targetId: "semgrun" } as const;

    const r = runAbilities(ps, lethal, ctx);

    expect(r.participants[0].combatStats.currentHp).toBe(Math.floor(40 * 0.3));
    expect(r.participants[1].combatStats.morale).toBe(ally.combatStats.morale + 1);

    const down = { ...r.participants[0], combatStats: { ...r.participants[0].combatStats, currentHp: 0, status: "unconscious" as const } };

    const again = runAbilities([down, r.participants[1], r.participants[2]], lethal, ctx);

    expect(again.participants[0].combatStats.currentHp).toBe(0);
  });

  it("руни: перша опція дістається всім союзникам", () => {
    const ps = [semgrun(set), ally, foe("e")];

    const r = runAbilities(ps, hitSemgrun, { round: 1, rng: seq(0) });

    for (const id of ["semgrun", "a"]) {
      expect(collectModifiers(r.participants, id, { damage: { kind: "melee" } }).percent).toBe(10);
    }

    expect(collectModifiers(r.participants, "e", { damage: { kind: "melee" } }).percent).toBe(0);
  });
});
