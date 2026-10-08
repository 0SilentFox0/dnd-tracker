import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { castSpell } from "@/lib/utils/battle/spell";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const spellOf = (over: Partial<SpellDefinition> = {}, extra: Partial<CastableSpell> = {}): CastableSpell => ({
  id: "sp",
  name: "Заклинання",
  level: 1,
  groupId: "chaos",
  definition: { dice: 2, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [fire], raceModifiers: [], ...over },
  ...extra,
});

const withSlots = (p: BattleParticipant): BattleParticipant => ({ ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } });

const caster = () => withSlots(makeParticipant({ id: "c" }));

const enemy = (id: string, raceId?: string): BattleParticipant => {
  const p = makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

  return { ...p, abilities: { ...p.abilities, raceId } };
};

const hp = (r: { allParticipantsUpdated: BattleParticipant[] }, id: string) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.combatStats.currentHp as number;

function cast(spell: CastableSpell, targetIds: string[], others: BattleParticipant[], over: { caster?: BattleParticipant; saveRolls?: { participantId: string; roll: number }[]; diceRolls?: number[] } = {}) {
  const c = over.caster ?? caster();

  return castSpell({ caster: c, spell, targetIds, allParticipants: [c, ...others], currentRound: 1, battleId: "b", diceRolls: over.diceRolls ?? [3, 3], saveRolls: over.saveRolls, rng: seq(0.5) });
}

describe("targeting kinds", () => {
  const c = caster();

  const ally = makeParticipant({ id: "a" });

  const dead = { ...makeParticipant({ id: "d" }), combatStats: { ...makeParticipant({ id: "d" }).combatStats, currentHp: 0, status: "dead" as const } };

  const e1 = enemy("e1");

  const e2 = enemy("e2");

  const ps = [c, ally, dead, e1, e2];

  const resolve = (targeting: Parameters<typeof resolveSpellTargets>[3], chosen: string[]) => resolveSpellTargets(ps, c, { id: "sp", groupId: "chaos", level: 1 }, targeting, chosen);

  it("self ігнорує вибір", () => {
    expect(resolve({ kind: "self" }, ["e1"])).toEqual({ ok: true, targetIds: ["c"] });
  });

  it("ally і enemy: одна жива ціль потрібної сторони", () => {
    expect(resolve({ kind: "ally" }, ["a"])).toEqual({ ok: true, targetIds: ["a"] });
    expect(resolve({ kind: "ally" }, ["e1"]).ok).toBe(false);
    expect(resolve({ kind: "enemy" }, ["e1"])).toEqual({ ok: true, targetIds: ["e1"] });
    expect(resolve({ kind: "enemy" }, ["e1", "e2"]).ok).toBe(false);
    expect(resolve({ kind: "enemy" }, ["a"]).ok).toBe(false);
    expect(resolve({ kind: "enemy" }, []).ok).toBe(false);
  });

  it("allyDead: лише полеглий союзник", () => {
    expect(resolve({ kind: "allyDead" }, ["d"])).toEqual({ ok: true, targetIds: ["d"] });
    expect(resolve({ kind: "allyDead" }, ["a"]).ok).toBe(false);
  });

  it("allAlliesDead: усі полеглі союзники заклинателя, чужі й живі — ні", () => {
    const fallenEnemy = { ...enemy("fe"), combatStats: { ...enemy("fe").combatStats, currentHp: 0, status: "dead" as const } };

    const all = [...ps, fallenEnemy, { ...dead, basicInfo: { ...dead.basicInfo, id: "d2" } }];

    expect(resolveSpellTargets(all, c, { id: "sp", groupId: "chaos", level: 1 }, { kind: "allAlliesDead" }, [])).toEqual({ ok: true, targetIds: ["d", "d2"] });
    expect(resolveSpellTargets([c, ally, e1], c, { id: "sp", groupId: "chaos", level: 1 }, { kind: "allAlliesDead" }, []).ok).toBe(false);
  });

  it("area: до maxTargets цілей зазначеної сторони", () => {
    expect(resolve({ kind: "area", side: "enemy", maxTargets: 2 }, ["e1", "e2"])).toEqual({ ok: true, targetIds: ["e1", "e2"] });
    expect(resolve({ kind: "area", side: "enemy", maxTargets: 1 }, ["e1", "e2"]).ok).toBe(false);
    expect(resolve({ kind: "area", side: "enemy", maxTargets: 3 }, ["a"]).ok).toBe(false);
  });

  it("allAllies, allEnemies, everyone беруть лише живих", () => {
    expect(resolve({ kind: "allAllies" }, [])).toEqual({ ok: true, targetIds: ["c", "a"] });
    expect(resolve({ kind: "allEnemies" }, [])).toEqual({ ok: true, targetIds: ["e1", "e2"] });
    expect(resolve({ kind: "everyone" }, [])).toEqual({ ok: true, targetIds: ["c", "a", "e1", "e2"] });
  });

  it("скіл spellTargeting all розширює ally-бафф на всіх союзників", () => {
    const widened = { ...c, battleData: { ...c.battleData, resolvedAbilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "all" }] })] } };

    const r = resolveSpellTargets([widened, ally, e1], widened, { id: "sp", groupId: "light", level: 1 }, { kind: "ally" }, ["a"]);

    expect(r.ok && r.targetIds.sort()).toEqual(["a", "c"]);
  });
});

describe("castSpell", () => {
  it("шкода = кубики + рівень, один кидок на всі цілі", () => {
    const r = cast(spellOf({ targeting: { kind: "area", side: "enemy", maxTargets: 2 } }), ["e1", "e2"], [enemy("e1"), enemy("e2")]);

    expect(hp(r, "e1")).toBe(200 - 7);
    expect(hp(r, "e2")).toBe(200 - 7);
  });

  it("рятівний кидок half: успішний кидок ділить шкоду навпіл", () => {
    const spell = spellOf({ resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, targeting: { kind: "area", side: "enemy", maxTargets: 3 } });

    const r = cast(spell, ["e1", "e2", "e3"], [enemy("e1"), enemy("e2"), enemy("e3")], {
      saveRolls: [{ participantId: "e1", roll: 1 }, { participantId: "e2", roll: 9 }, { participantId: "e3", roll: 1 }],
    });

    expect([hp(r, "e1"), hp(r, "e2"), hp(r, "e3")]).toEqual([193, 197, 193]);
    expect(r.battleAction.actionDetails.savingThrows?.map((s) => s.result)).toEqual(["fail", "success", "fail"]);
  });

  it("рятівний кидок none: успіх скасовує все; half пропускає недіапазонні ефекти", () => {
    const stun: Effect = { kind: "applyCondition", condition: "no_reaction", duration: { rounds: 2 } };

    const none = cast(spellOf({ resolution: { kind: "save", ability: "dexterity", onSuccess: "none" }, effects: [fire, stun] }), ["e1"], [enemy("e1")], { saveRolls: [{ participantId: "e1", roll: 20 }] });

    expect(hp(none, "e1")).toBe(200);
    expect(none.allParticipantsUpdated.find((p) => p.basicInfo.id === "e1")?.battleData.activeEffects).toHaveLength(0);

    const half = cast(spellOf({ resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [fire, stun] }), ["e1"], [enemy("e1")], { saveRolls: [{ participantId: "e1", roll: 20 }] });

    expect(hp(half, "e1")).toBe(197);
    expect(half.allParticipantsUpdated.find((p) => p.basicInfo.id === "e1")?.battleData.activeEffects).toHaveLength(0);

    const fail = cast(spellOf({ resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [fire, stun] }), ["e1"], [enemy("e1")], { saveRolls: [{ participantId: "e1", roll: 1 }] });

    expect(fail.allParticipantsUpdated.find((p) => p.basicInfo.id === "e1")?.battleData.activeEffects).toHaveLength(1);
  });

  it("расовий модифікатор: −100 % — імунітет, +100 % — подвоєння", () => {
    const spell = spellOf({ targeting: { kind: "allEnemies" }, raceModifiers: [{ raceId: "human", percent: -100 }, { raceId: "orc", percent: 100 }] });

    const r = cast(spell, ["h", "o", "g"], [enemy("h", "human"), enemy("o", "orc"), enemy("g", "goblin")]);

    expect([hp(r, "h"), hp(r, "o"), hp(r, "g")]).toEqual([200, 200 - 14, 200 - 7]);
    expect(r.battleAction.resultText).toContain("імунітет раси");
  });

  it("Армагеддон (everyone) б'є і заклинателя, і його союзників", () => {
    const ally = makeParticipant({ id: "a", hp: 50, maxHp: 50 });

    const r = cast(spellOf({ targeting: { kind: "everyone" } }), ["c", "a", "e1"], [ally, enemy("e1")]);

    expect(hp(r, "a")).toBe(43);
    expect(hp(r, "c")).toBe(13);
    expect(hp(r, "e1")).toBe(193);
  });

  it("DoT з кубиками кидається один раз на каст", () => {
    const wall: Effect = { kind: "dot", damagePerRound: { spellRoll: 50 }, damageType: "fire", duration: { rounds: 3 } };

    const r = cast(spellOf({ targeting: { kind: "allEnemies" }, effects: [wall] }), ["e1", "e2"], [enemy("e1"), enemy("e2")], { diceRolls: [5, 6] });

    const dots = ["e1", "e2"].map((id) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.battleData.activeEffects[0].dotDamage?.damagePerRound);

    expect(dots).toEqual([6, 6]);
  });

  it("Ланцюгова блискавка: шкода спадає по цілях", () => {
    const chain: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "lightning", falloff: [100, 50, 25] };

    const r = cast(spellOf({ targeting: { kind: "area", side: "enemy", maxTargets: 3 }, effects: [chain] }), ["e1", "e2", "e3"], [enemy("e1"), enemy("e2"), enemy("e3")], { diceRolls: [10, 9] });

    expect([hp(r, "e1"), hp(r, "e2"), hp(r, "e3")]).toEqual([200 - 20, 200 - 10, 200 - 5]);
  });

  it("опір і імунітет до стихії застосовуються до шкоди заклинання", () => {
    const resistant = enemy("e1");

    resistant.battleData.resolvedAbilities = [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }] })];

    const r = cast(spellOf(), ["e1"], [resistant]);

    expect(hp(r, "e1")).toBe(200 - 3);
  });

  it("Відродження лісу: усі полеглі союзники повертаються з 30 % HP", () => {
    const fallen = (id: string) => ({ ...makeParticipant({ id, hp: 0, maxHp: 50 }), combatStats: { ...makeParticipant({ id, maxHp: 50 }).combatStats, currentHp: 0, maxHp: 50, status: "dead" as const } });

    const rebirth = spellOf({ dice: 0, targeting: { kind: "allAlliesDead" }, effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 30 }, revive: true }] });

    const r = cast(rebirth, ["d1", "d2"], [fallen("d1"), fallen("d2")], { diceRolls: [] });

    expect(["d1", "d2"].map((id) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.combatStats)).toEqual([expect.objectContaining({ currentHp: 15, status: "active" }), expect.objectContaining({ currentHp: 15, status: "active" })]);
  });

  it("лікування й Воскресіння (allyDead) через heal з revive", () => {
    const fallen = { ...makeParticipant({ id: "d", hp: 0, maxHp: 40 }), combatStats: { ...makeParticipant({ id: "d", maxHp: 40 }).combatStats, currentHp: 0, maxHp: 40, status: "dead" as const } };

    const res = spellOf({ dice: 0, targeting: { kind: "allyDead" }, effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 50 }, revive: true }] });

    const r = cast(res, ["d"], [fallen], { diceRolls: [] });

    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "d")?.combatStats).toMatchObject({ currentHp: 20, status: "active" });
  });

  it("регенерація: hot на союзника з кубиками заклинання", () => {
    const regen = spellOf({ dice: 1, targeting: { kind: "ally" }, effects: [{ kind: "hot", healPerRound: { spellRoll: 100 }, duration: { rounds: 3 } }] });

    const r = cast(regen, ["a"], [makeParticipant({ id: "a" })], { diceRolls: [4] });

    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "a")?.battleData.activeEffects[0].hotHeal).toEqual({ healPerRound: 5 });
  });

  it("ефект self діє на заклинателя, а не на ціль; summon повертає запит", () => {
    const buff: Effect = { kind: "modifyStat", stat: "armor", flat: 2, duration: { rounds: 2 }, target: "self" };

    const r = cast(spellOf({ dice: 0, effects: [buff, { kind: "summon", unitId: "u1" }] }), ["e1"], [enemy("e1")], { diceRolls: [] });

    expect(r.allParticipantsUpdated[0].battleData.activeEffects).toHaveLength(1);
    expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "e1")?.battleData.activeEffects).toHaveLength(0);
    expect(r.summons).toEqual([expect.objectContaining({ unitId: "u1", ownerId: "c" })]);
  });

  it("слот витрачається; без слота — нічого не відбувається", () => {
    const ok = cast(spellOf(), ["e1"], [enemy("e1")]);

    expect(ok.casterUpdated.spellcasting.spellSlots["1"].current).toBe(1);

    const empty = { ...caster(), spellcasting: { ...caster().spellcasting, spellSlots: { "1": { max: 2, current: 0 } } } };

    const none = cast(spellOf(), ["e1"], [enemy("e1")], { caster: empty });

    expect(none.success).toBe(false);
    expect(hp(none, "e1")).toBe(200);
  });

  it("Немічність: −2 AC складається до maxStacks, далі оновлюється найкоротший стак", () => {
    const frail = spellOf({ dice: 0, stackable: true, maxStacks: 3, effects: [{ kind: "modifyStat", stat: "armor", flat: -2, duration: { rounds: 3 } }] });

    const c = caster();

    let target = enemy("e1");

    for (let i = 0; i < 4; i++) {
      const r = castSpell({ caster: c, spell: frail, targetIds: ["e1"], allParticipants: [c, target], currentRound: i + 1, battleId: "b", diceRolls: [], rng: seq(0.5) });

      target = r.allParticipantsUpdated.find((p) => p.basicInfo.id === "e1") as BattleParticipant;
    }

    expect(target.battleData.activeEffects).toHaveLength(3);
  });

  it("без stackable повторний каст оновлює один ефект", () => {
    const frail = spellOf({ dice: 0, effects: [{ kind: "modifyStat", stat: "armor", flat: -2, duration: { rounds: 3 } }] });

    const c = caster();

    let target = enemy("e1");

    for (let i = 0; i < 3; i++) {
      target = castSpell({ caster: c, spell: frail, targetIds: ["e1"], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [], rng: seq(0.5) }).allParticipantsUpdated.find((p) => p.basicInfo.id === "e1") as BattleParticipant;
    }

    expect(target.battleData.activeEffects).toHaveLength(1);
  });
});
