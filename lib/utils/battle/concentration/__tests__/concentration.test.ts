import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { beginConcentration, concentrationCheck, dropConcentration, isZoneConcentrationLive } from "@/lib/utils/battle/concentration";
import { applyCondition5e } from "@/lib/utils/battle/conditions";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { DEATH_SAVES_TIMED_KEY } from "@/lib/utils/battle/death-saves";
import { hazardHit, hazardUnder } from "@/lib/utils/battle/grid";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const rulesOn = (dcCap: number | null = null): Ruleset => ({ ...DEFAULT_RULES, concentration: { enabled: true, dcCap } });

const slowEffect: Effect = { kind: "modifyStat", stat: "armor", flat: -2, duration: { rounds: 3 } };

const spellOf = (concentration: boolean, effects: Effect[] = [slowEffect]): CastableSpell => ({
  id: "sp",
  name: "Сповільнення",
  level: 1,
  groupId: "chaos",
  definition: { dice: 0, cost: "action", targeting: { kind: "area", side: "enemy", maxTargets: 2 }, resolution: { kind: "auto" }, effects, raceModifiers: [], ...(concentration && { concentration: true }) },
});

const caster = (): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 3, current: 3 } } } };
};

const foe = (id: string) => makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 });

const cast = (spell: CastableSpell, ps: BattleParticipant[], rules?: Ruleset) =>
  castSpell({ caster: ps[0], spell, targetIds: ["e1", "e2"], allParticipants: ps, currentRound: 1, battleId: "b", diceRolls: [], rng: seq(0.5), rules });

const effectsOf = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id)?.battleData.activeEffects ?? [];

const concentrating = (): BattleParticipant[] => {
  const c = caster();

  const begun = beginConcentration([c, foe("e1"), foe("e2")], "c", "c:sp@1#0", "Сповільнення", 3);

  return begun.participants.map((p) => (p.basicInfo.id === "c" ? p : { ...p, battleData: { ...p.battleData, activeEffects: [makeEffect("slow", { concentrationOf: { casterId: "c", castId: "c:sp@1#0" } })] } }));
};

describe("каст із концентрацією", () => {
  it("ставить маркер на кастера й тегує ефекти цілей одним castId", () => {
    const r = cast(spellOf(true), [caster(), foe("e1"), foe("e2")], rulesOn());

    const marker = effectsOf(r.allParticipantsUpdated, "c").find((e) => e.concentration);

    expect(marker?.name).toBe("Концентрація: Сповільнення");
    expect(marker?.duration).toBe(3);
    expect(effectsOf(r.allParticipantsUpdated, "e1")[0].concentrationOf?.castId).toBe(marker?.concentration?.castId);
    expect(effectsOf(r.allParticipantsUpdated, "e2")[0].concentrationOf?.castId).toBe(marker?.concentration?.castId);
  });

  it("без правила або без прапорця заклинання нічого не змінює", () => {
    const ps = () => [caster(), foe("e1"), foe("e2")];

    const base = cast(spellOf(false), ps(), rulesOn());

    expect(effectsOf(base.allParticipantsUpdated, "c")).toEqual([]);
    expect(effectsOf(base.allParticipantsUpdated, "e1")[0].concentrationOf).toBeUndefined();

    const off = cast(spellOf(true), ps(), DEFAULT_RULES);

    expect(effectsOf(off.allParticipantsUpdated, "c")).toEqual([]);
    expect(effectsOf(off.allParticipantsUpdated, "e1")[0]).not.toHaveProperty("concentrationOf");
  });

  it("тривалість маркера — 10 раундів, якщо в ефектів немає тривалості", () => {
    const r = cast(spellOf(true, [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }]), [caster(), foe("e1"), foe("e2")], rulesOn());

    expect(effectsOf(r.allParticipantsUpdated, "c").find((e) => e.concentration)?.duration).toBe(10);
  });

  it("новий каст знімає ефекти попереднього", () => {
    const first = cast(spellOf(true), [caster(), foe("e1"), foe("e2")], rulesOn());

    const second = castSpell({ caster: first.casterUpdated, spell: { ...spellOf(true), id: "sp2", name: "Інше", definition: { ...spellOf(true).definition, effects: [] } }, targetIds: ["e1"], allParticipants: first.allParticipantsUpdated, currentRound: 2, battleId: "b", diceRolls: [], rng: seq(0.5), rules: rulesOn() });

    expect(effectsOf(second.allParticipantsUpdated, "e1")).toEqual([]);
    expect(effectsOf(second.allParticipantsUpdated, "c").filter((e) => e.concentration)).toHaveLength(1);
    expect(effectsOf(second.allParticipantsUpdated, "c")[0].concentration?.spellName).toBe("Інше");
  });
});

describe("перевірка концентрації", () => {
  const hit = (damage: number, rng: () => number, rules = rulesOn()) => {
    const ps = concentrating();

    const caster = ps[0];

    return concentrationCheck({ caster: { ...caster, combatStats: { ...caster.combatStats, currentHp: 15 } }, damage, participants: ps, rules, rng });
  };

  it.each([
    [30, 15],
    [8, 10],
  ])("шкода %i — СК %i", (damage, dc) => {
    expect(hit(damage, () => 0.5).messages[0]).toContain(`проти СК ${dc}`);
  });

  it("dcCap обмежує СК; без нього СК = ½ шкоди", () => {
    expect(hit(100, () => 0.5, rulesOn(30)).messages[0]).toContain("проти СК 30");
    expect(hit(100, () => 0.5, rulesOn(null)).messages[0]).toContain("проти СК 50");
  });

  it("провал знімає ефекти з усіх цілей і маркер", () => {
    const r = hit(30, () => 0);

    expect(r.messages.join(" ")).toContain("втрачає концентрацію на «Сповільнення»");
    expect(effectsOf(r.participants, "e1")).toEqual([]);
    expect(effectsOf(r.participants, "e2")).toEqual([]);
    expect(effectsOf(r.participants, "c")).toEqual([]);
  });

  it("успіх лишає все", () => {
    const r = hit(8, () => 0.99);

    expect(r.messages[0]).toContain("утримує");
    expect(effectsOf(r.participants, "e1")).toHaveLength(1);
    expect(effectsOf(r.participants, "c")).toHaveLength(1);
  });

  it("хук шкоди: провал і 0 HP без кидка", () => {
    const ps = concentrating();

    const before = ps[0];

    const failed = applyDamageConsequences({ before, after: { ...before, combatStats: { ...before.combatStats, currentHp: 10 } }, amount: 30, rules: rulesOn(), rng: () => 0, participants: ps });

    expect(effectsOf(failed.participants, "e1")).toEqual([]);
    expect(failed.participant.battleData.activeEffects).toEqual([]);

    const downed = applyDamageConsequences({ before, after: { ...before, combatStats: { ...before.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } }, amount: 3, rules: rulesOn(), rng: () => 0.99, participants: ps });

    expect(effectsOf(downed.participants, "e1")).toEqual([]);
    expect(downed.messages[0]).toContain("втрачає концентрацію");
  });

  it("правило вимкнене: хук нічого не кидає", () => {
    const ps = concentrating();

    const r = applyDamageConsequences({ before: ps[0], after: ps[0], amount: 30, rules: DEFAULT_RULES, rng: () => 0, participants: ps });

    expect(r.messages).toEqual([]);
    expect(effectsOf(r.participants, "e1")).toHaveLength(1);
  });
});

describe("недієздатність", () => {
  it.each(["incapacitated", "stunned"] as const)("%s знімає концентрацію", (key) => {
    const r = applyCondition5e(concentrating(), "c", { key, rounds: 2, source: undefined, sourceName: "X", timedKey: "t", round: 1 });

    expect(effectsOf(r.participants, "e1")).toEqual([]);
    expect(effectsOf(r.participants, "c").some((e) => e.concentration)).toBe(false);
    expect(r.messages.join(" ")).toContain("втрачає концентрацію");
  });
});

describe("зона", () => {
  const tag = { casterId: "c", castId: "c:sp@1#0" };

  const map: BattleMapConfig = { cols: 5, rows: 5, background: null, opacity: 0.3, terrain: { "1:1": { kind: "hazard", damage: { amount: 5, type: "fire", concentrationOf: tag } } } };

  const target = { ...foe("e1"), battleData: { ...foe("e1").battleData, position: { x: 1, y: 1 } } };

  it("живе, поки кастер концентрується", () => {
    const ps = concentrating();

    expect(isZoneConcentrationLive(ps, tag)).toBe(true);
    expect(hazardUnder(map, target, undefined, ps)).not.toBeNull();
    expect(hazardHit(target, map.terrain!["1:1"], 1, ps, () => 0)?.damage).toBe(5);
  });

  it("після втрати концентрації не шкодить", () => {
    const ps = dropConcentration(concentrating(), "c", "").participants;

    expect(isZoneConcentrationLive(ps, tag)).toBe(false);
    expect(hazardUnder(map, target, undefined, ps)).toBeNull();
    expect(hazardHit(target, map.terrain!["1:1"], 1, ps, () => 0)).toBeNull();
  });
});

describe("review fixes", () => {
  it("тегує лише ефекти самого заклинання: непритомність героя від шкоди лишається", () => {
    const hero = (): BattleParticipant => {
      const p = foe("e1");

      return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.CHARACTER }, combatStats: { ...p.combatStats, currentHp: 3, maxHp: 500 } };
    };

    const rules: Ruleset = { ...rulesOn(), deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true } };

    const base = spellOf(true, [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }]);

    const spell = { ...base, definition: { ...base.definition, dice: 2 } };

    const r = castSpell({ caster: caster(), spell, targetIds: ["e1"], allParticipants: [caster(), hero()], currentRound: 1, battleId: "b", diceRolls: [3, 3], rng: seq(0.5), rules });

    const down = effectsOf(r.allParticipantsUpdated, "e1").find((e) => e.abilityKey === DEATH_SAVES_TIMED_KEY);

    expect(down).toBeDefined();
    expect(down?.concentrationOf).toBeUndefined();

    const marker = effectsOf(r.allParticipantsUpdated, "c").find((e) => e.concentration);

    const ended = dropConcentration(r.allParticipantsUpdated, "c", "");

    expect(marker).toBeDefined();
    expect(effectsOf(ended.participants, "e1").some((e) => e.abilityKey === DEATH_SAVES_TIMED_KEY)).toBe(true);
  });

  it("тривалість концентрації враховує зону", () => {
    const spell: CastableSpell = {
      ...spellOf(true),
      definition: { ...spellOf(true).definition, targeting: { kind: "template", shape: "circle", size: 20, side: "enemy", maxTargets: 2, zone: { rounds: 6 } } },
    };

    const r = cast(spell, [caster(), foe("e1"), foe("e2")], rulesOn());

    expect(effectsOf(r.allParticipantsUpdated, "c").find((e) => e.concentration)?.duration).toBe(6);
  });

  it("зона згасає, коли кастер мертвий", () => {
    const tag = { casterId: "c", castId: "c:sp@1#0" };

    const ps = concentrating().map((p) => (p.basicInfo.id === "c" ? { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD } } : p));

    expect(isZoneConcentrationLive(ps, tag)).toBe(false);
  });

  it("смерть від виснаження знімає концентрацію", () => {
    const r = applyCondition5e(concentrating(), "c", { key: "exhaustion", levels: 6, rounds: 2, source: undefined, sourceName: "X", timedKey: "t", round: 1 });

    expect(r.participants.find((p) => p.basicInfo.id === "c")?.combatStats.status).toBe(CombatStatus.DEAD);
    expect(effectsOf(r.participants, "c").some((e) => e.concentration)).toBe(false);
    expect(effectsOf(r.participants, "e1")).toEqual([]);
  });
});
