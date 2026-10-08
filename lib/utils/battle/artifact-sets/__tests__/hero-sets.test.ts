import { describe, expect, it } from "vitest";

import { LIBRARY_ARTIFACT_SETS } from "@/data/library/artifacts";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectModifiers, findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { Ability } from "@/lib/utils/abilities/schema";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { splitGuardedDamage } from "@/lib/utils/battle/attack/process/guard";
import { runAttackPhase } from "@/lib/utils/battle/attack-phase/run-attack-phase";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";
import { spellTargetingFor } from "@/lib/utils/battle/spell/spell-targeting";
import type { AbilityEvent } from "@/types/abilities";
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

describe("Регалії Сар-Іссуса", () => {
  const { pieces, set } = abilitiesOf("set-sar-issus");

  const zehir = (list: Ability[]) => makeParticipant({ id: "zehir", abilities: asArtifact(list) });

  const cast = (school: string): AbilityEvent => ({ type: "spellCast", phase: "after", actorId: "zehir", targetIds: ["e"], spellId: "s", school, level: 1 });

  it("корона: Світло лікує союзників на 5 %, двічі за бій", () => {
    const hurt = makeParticipant({ id: "a", hp: 50, maxHp: 100 });

    let ps = [zehir(pieces["crown-of-sar-issus"]), hurt, foe("e")];

    ps = runAbilities(ps, cast("Світло"), ctx).participants;
    expect(ps[1].combatStats.currentHp).toBe(55);

    ps = runAbilities(ps, cast("Світло"), ctx).participants;
    ps = runAbilities(ps, cast("Світло"), ctx).participants;
    expect(ps[1].combatStats.currentHp).toBe(60);
  });

  it("мантія: Темрява знижує мораль ворогів на 1 раз за бій", () => {
    let ps = [zehir(pieces["robe-of-sar-issus"]), foe("e")];

    const base = ps[1].combatStats.morale;

    ps = runAbilities(ps, cast("Темрява"), ctx).participants;
    expect(ps[1].combatStats.morale).toBe(base - 1);

    ps = runAbilities(ps, cast("Темрява"), ctx).participants;
    expect(ps[1].combatStats.morale).toBe(base - 1);
  });

  it("посох: Хаос підпалює ворогів", () => {
    const r = runAbilities([zehir(pieces["staff-of-sar-issus"]), foe("e")], cast("Хаос"), ctx);

    expect(r.participants[1].battleData.activeEffects.some((e) => e.dotDamage)).toBe(true);
  });

  it("перстень: Природа повертає слот", () => {
    const base = zehir(pieces["ring-of-sar-issus"]);

    const caster = { ...base, spellcasting: { ...base.spellcasting, spellSlots: { "1": { current: 0, max: 2 } } } };

    const r = runAbilities([caster, foe("e")], cast("Природа"), ctx);

    expect(r.participants[0].spellcasting.spellSlots["1"].current).toBe(1);
  });

  it("сет: закляття 1–2 рівня б'ють до 2 цілей, 3 рівня — ні", () => {
    const ps = [zehir(set), foe("e")];

    expect(spellTargetingFor(ps, "zehir", { id: "s", groupId: "g", level: 2 })).toEqual({ mode: "area", maxTargets: 2 });
    expect(spellTargetingFor(ps, "zehir", { id: "s", groupId: "g", level: 3 }).mode).toBe("single");
  });
});

describe("Дух лева", () => {
  const { pieces, set } = abilitiesOf("set-lions-spirit");

  const godric = (list: Ability[], hp?: number) => makeParticipant({ id: "godric", abilities: asArtifact(list), hp, maxHp: 40 });

  describe("плащ", () => {
    const cape = pieces["cape-of-the-lions-mane"];

    const bonus = (ps: BattleParticipant[]) => {
      const run = runAbilities(ps, { type: "attack", phase: "before", actorId: "godric", targetId: "e", attackKind: AttackType.MELEE }, ctx);

      return collectModifiers(run.participants, "godric", { damage: { kind: "melee", targetId: "e" } }, run.actionModifiers.godric).percent;
    };

    const hitAlly = { type: "hit", actorId: "e", targetId: "a", attackKind: AttackType.MELEE, damage: 5 } as const;

    it("Кривдник отримує +10 % без стакання", () => {
      let ps = [godric(cape), makeParticipant({ id: "a" }), foe("e")];

      expect(bonus(ps)).toBe(0);

      for (let i = 0; i < 3; i++) ps = runAbilities(ps, hitAlly, ctx).participants;

      expect(ps[2].battleData.activeEffects.length).toBeGreaterThan(0);
      expect(bonus(ps)).toBe(10);
    });

    it("влучання по самому Годрику мітки не ставить", () => {
      const ps = [godric(cape), makeParticipant({ id: "a" }), foe("e")];

      const r = runAbilities(ps, { type: "hit", actorId: "e", targetId: "godric", attackKind: AttackType.MELEE, damage: 5 }, ctx);

      expect(r.participants[2].battleData.activeEffects).toHaveLength(0);
    });
  });

  it("корона: +5 % до шансу додаткового ходу", () => {
    const ps = [godric(pieces["lion-crown"])];

    expect(findFlags(ps, "godric", "moraleChance").map((f) => f.percent)).toEqual([5]);
  });

  it("намисто: смертельний удар раз за бій, 25 %", () => {
    const ally = makeParticipant({ id: "a" });

    const lethal = { type: "lethalDamage", actorId: "e", targetId: "godric" } as const;

    const r = runAbilities([godric(pieces["necklace-of-the-lion"], 0), ally, foe("e")], lethal, ctx);

    expect(r.participants[0].combatStats.currentHp).toBe(10);
    expect(r.participants[1].combatStats.morale).toBe(ally.combatStats.morale + 1);
  });

  it("сет: рик знижує мораль цілі раз за раунд", () => {
    const hit = { type: "hit", actorId: "godric", targetId: "e", attackKind: AttackType.MELEE, damage: 5 } as const;

    let ps = [godric(set), foe("e")];

    const base = ps[1].combatStats.morale;

    ps = runAbilities(ps, hit, ctx).participants;
    ps = runAbilities(ps, hit, ctx).participants;

    expect(ps[1].combatStats.morale).toBe(base - 1);
  });
});

describe("Регалії світанку", () => {
  const { pieces, set } = abilitiesOf("set-dawn-regalia");

  const isabel = (list: Ability[], hp = 100) => makeParticipant({ id: "isabel", abilities: asArtifact(list), hp, maxHp: 100 });

  const ally = (hp = 100) => makeParticipant({ id: "ally", hp, maxHp: 100 });

  const roundStart = { type: "roundStart" } as const;

  it("корона: союзники +5 % до шансу додаткового ходу", () => {
    const ps = [isabel(pieces["crown-of-leadership"]), ally()];

    expect(findFlags(ps, "ally", "moraleChance").map((f) => f.percent)).toEqual([5]);
    expect(findFlags(ps, "isabel", "moraleChance").map((f) => f.percent)).toEqual([5]);
  });

  it("намисто: вбивство союзником дає мораль усім, раз за раунд", () => {
    const ps = [isabel(pieces["necklace-of-victory"]), ally(), foe("e")];

    const kill = { type: "kill", actorId: "ally", targetId: "e" } as const;

    const first = runAbilities(ps, kill, ctx);

    expect(first.participants[0].combatStats.morale).toBe(ps[0].combatStats.morale + 1);
    expect(first.participants[1].combatStats.morale).toBe(ps[1].combatStats.morale + 1);

    const second = runAbilities(first.participants, kill, ctx);

    expect(second.participants[1].combatStats.morale).toBe(first.participants[1].combatStats.morale);
  });

  describe("обладунок", () => {
    const armor = pieces["armor-of-valor"];

    it("союзник нижче 30 %: усі отримують лікування в часі, раз за бій", () => {
      const first = runAbilities([isabel(armor), ally(20)], roundStart, ctx);

      for (const p of first.participants) expect(p.battleData.activeEffects.some((e) => e.hotHeal)).toBe(true);

      const cleared = first.participants.map((p) => ({ ...p, battleData: { ...p.battleData, activeEffects: [] } }));

      const second = runAbilities(cleared, roundStart, { ...ctx, round: 2 });

      expect(second.participants[1].battleData.activeEffects).toHaveLength(0);
    });

    it("сама Ізабель нижче 30 % теж запускає", () => {
      const r = runAbilities([isabel(armor, 20), ally()], roundStart, ctx);

      expect(r.participants[1].battleData.activeEffects.some((e) => e.hotHeal)).toBe(true);
    });
  });

  it("сет: союзник нижче 50 % — ініціатива +2 і шкода +10 %, раз за бій", () => {
    const first = runAbilities([isabel(set), ally(40)], roundStart, ctx);

    const mods = (ps: BattleParticipant[]) => collectModifiers(ps, "ally", { damage: { kind: "melee" } });

    expect(mods(first.participants).percent).toBe(10);
    expect(collectModifiers(first.participants, "ally", { stat: "initiative" }).flat).toBe(2);

    const cleared = first.participants.map((p) => ({ ...p, battleData: { ...p.battleData, activeEffects: [] } }));

    const second = runAbilities(cleared, roundStart, { ...ctx, round: 2 });

    expect(mods(second.participants).percent).toBe(0);
  });
});

describe("Кігті Ігг-Шайла", () => {
  const { pieces, set } = abilitiesOf("set-yggshail-claws");

  const raelag = (list: Ability[]) => makeParticipant({ id: "raelag", abilities: asArtifact(list), hp: 50, maxHp: 100 });

  it("клинок: +15 % по цілі нижче 50 % HP", () => {
    const bonus = (target: BattleParticipant) => {
      const run = runAbilities([raelag(pieces["moonblade"]), target], { type: "attack", phase: "before", actorId: "raelag", targetId: "e", attackKind: AttackType.MELEE }, ctx);

      return collectModifiers(run.participants, "raelag", { damage: { kind: "melee", targetId: "e" } }, run.actionModifiers.raelag).percent;
    };

    expect(bonus(foe("e", 40, 100))).toBe(15);
    expect(bonus(foe("e", 60, 100))).toBe(0);
  });

  it("намисто: вбивство лікує Раїлага на 15 % max HP", () => {
    const r = runAbilities([raelag(pieces["necklace-of-the-bloody-claw"]), foe("e")], { type: "kill", actorId: "raelag", targetId: "e" }, ctx);

    expect(r.participants[0].combatStats.currentHp).toBe(65);
  });

  it("перстень: вбивство отруює всіх живих ворогів", () => {
    const ring = raelag(pieces["cursed-ring"]);

    const strong = { ...ring, battleData: { ...ring.battleData, attacks: [{ id: "a", name: "Удар", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d1+19", damageType: "slashing" } as BattleAttack] } };

    const r = runAbilities([strong, foe("e1"), foe("e2"), { ...foe("dead", 0), combatStats: { ...foe("dead", 0).combatStats, status: "dead" as const } }], { type: "kill", actorId: "raelag", targetId: "dead" }, ctx);

    for (const i of [1, 2]) {
      const dot = r.participants[i].battleData.activeEffects.find((e) => e.dotDamage);

      expect(dot?.dotDamage?.damagePerRound).toBeGreaterThanOrEqual(3);
    }
  });

  describe("сет", () => {
    const hit = { type: "hit", actorId: "raelag", targetId: "e", attackKind: AttackType.MELEE, damage: 5 } as const;

    it("шанс 25 %: ціль без реакції", () => {
      const r = runAbilities([raelag(set), foe("e")], hit, { round: 1, rng: seq(0) });

      expect(r.participants[1].battleData.activeEffects.some((e) => e.effects.some((x) => x.type === "no_reaction"))).toBe(true);
      expect(r.participants[1].actionFlags.hasUsedReaction).toBe(true);
    });

    it("невдалий кидок: без ефекту", () => {
      const r = runAbilities([raelag(set), foe("e")], hit, { round: 1, rng: seq(0.99) });

      expect(r.participants[1].battleData.activeEffects).toHaveLength(0);
      expect(r.participants[1].actionFlags.hasUsedReaction).toBe(false);
    });
  });

  describe("сет і відсіч", () => {
    const sword = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing", targetType: "single" } as unknown as BattleAttack;

    const counter = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 0 }] });

    const duel = (rng: ReturnType<typeof seq>) => {
      const base = raelag(set);

      const attacker = { ...base, basicInfo: { ...base.basicInfo, controlledBy: "user-1" }, battleData: { ...base.battleData, attacks: [sword] } };

      const t = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "tgt", name: "tgt", side: ParticipantSide.ENEMY } });

      const target = { ...t, battleData: { ...t.battleData, attacks: [sword], resolvedAbilities: [counter] } };

      return runAttackPhase({
        battle: { initiativeOrder: [attacker, target], battleLog: [], currentRound: 1, currentTurnIndex: 0 },
        data: { attackerId: "raelag", targetIds: ["tgt"], d20Roll: 15, damageRolls: [3] },
        battleId: "b",
        userId: "user-1",
        isDM: false,
        rng,
      }).allBattleActions.map((a) => a.actionType);
    };

    it("паралізована ціль не відповідає відсіччю", () => {
      expect(duel(seq(0))).toEqual(["attack"]);
    });

    it("без паралічу відсіч є", () => {
      expect(duel(seq(0.99))).toContain("retaliation");
    });
  });
});
