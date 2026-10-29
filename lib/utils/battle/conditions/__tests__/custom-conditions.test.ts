import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema, attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyCondition5e, removeCondition5e } from "@/lib/utils/battle/conditions";
import { hazardHit } from "@/lib/utils/battle/grid";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { castSpell } from "@/lib/utils/battle/spell";
import { pacifiedBlock } from "@/lib/utils/battle/spell/spell-targeting";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { mergeRules, parseRules } from "@/lib/utils/rules/schema";
import type { BattleParticipant, TerrainCell } from "@/types/battle";

const PACIFIED = {
  key: "custom:pacified",
  name: "Умиротворений",
  description: "Не воює",
  markers: ["disable_melee_attacks", "disable_ranged_attacks", "no_hostile_spells", "no_damage_dealt"],
} as const;

const rules = (custom: unknown[] = [PACIFIED]): Ruleset => parseRules({ conditions: { enabled: true, custom } });

const apply = (target: BattleParticipant, key: string, over: Record<string, unknown> = {}, r: Ruleset = rules()) =>
  applyCondition5e([target], target.basicInfo.id, { key: key as never, rounds: 3, source: undefined, sourceName: "Тест", timedKey: "t", round: 1, rules: r, ...over });

const pacify = (p: BattleParticipant) => apply(p, "custom:pacified").participants[0];

describe("правила: custom-стани", () => {
  it("кампанія без custom не отримує ключа; невалідний запис скидає секцію", () => {
    expect(parseRules({}).conditions).toEqual(DEFAULT_RULES.conditions);
    expect("custom" in parseRules({}).conditions).toBe(false);
    expect(parseRules({ conditions: { enabled: true, custom: [{ key: "bad key", name: "x", description: "", markers: [] }] } }).conditions).toEqual(DEFAULT_RULES.conditions);
    expect(parseRules({ conditions: { custom: [{ ...PACIFIED, markers: ["unknown"] }] } }).conditions.custom).toBeUndefined();
  });

  it("патч зливає custom за key, не замінює", () => {
    const current = rules();

    const merged = mergeRules(current, { conditions: { custom: [{ key: "custom:other", name: "Інший", description: "", markers: [] }, { ...PACIFIED, name: "Новий" }] } });

    expect(merged.ok && merged.rules.conditions.custom?.map((c) => [c.key, c.name])).toEqual([["custom:other", "Інший"], ["custom:pacified", "Новий"]]);
  });
});

describe("накладання custom-стану", () => {
  const target = makeParticipant({ id: "t" });

  it("у лозі назва custom-стану лишається як у правилах", () => {
    expect(apply(target, "custom:pacified").messages[0]).toContain("— Умиротворений (3 р.)");
  });

  it("маркери і назва беруться з правил, перший маркер — ключ стану", () => {
    const [p] = apply(target, "custom:pacified").participants;

    const effect = p.battleData.activeEffects[0];

    expect(effect.name).toBe("Умиротворений");
    expect(effect.effects.map((m) => m.type)).toEqual(["custom:pacified", ...PACIFIED.markers]);
  });

  it("saveEnds і abilityEffects переходять на ефект", () => {
    const r = rules([{ ...PACIFIED, abilityEffects: [{ kind: "flag", flag: "disadvantage" }] }]);

    const [p] = apply(target, "custom:pacified", { saveEnds: { ability: "wisdom", dc: 13 } }, r).participants;

    expect(p.battleData.activeEffects[0].saveEnds).toMatchObject({ ability: "wisdom", dc: 13 });
    expect(p.battleData.activeEffects[0].abilityEffects).toHaveLength(1);
  });

  it("невизначений ключ — без змін і з поясненням", () => {
    const out = apply(target, "custom:ghost");

    expect(out.participants[0]).toBe(target);
    expect(out.messages[0]).toContain("не визначено в правилах кампанії");
    expect(apply(target, "custom:pacified", {}, parseRules({})).participants[0]).toBe(target);
  });

  it("знімається за ключем", () => {
    const [p] = apply(target, "custom:pacified").participants;

    const { participants, removed } = removeCondition5e([p], "t", "custom:pacified");

    expect(removed).toHaveLength(1);
    expect(participants[0].battleData.activeEffects).toHaveLength(0);
  });
});

describe("pacified: заклинання", () => {
  const caster = pacify(makeParticipant({ id: "c" }));

  const ally = makeParticipant({ id: "a" });

  const enemy = makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

  const ps = [caster, ally, enemy];

  it("ворожий таргетинг і ціль-ворог блокуються, лікування союзника — ні", () => {
    expect(pacifiedBlock(ps, caster, { kind: "enemy" }, [])).toBeTruthy();
    expect(pacifiedBlock(ps, caster, { kind: "ally" }, ["e"])).toBeTruthy();
    expect(pacifiedBlock(ps, caster, { kind: "ally" }, ["a"])).toBeNull();
    expect(pacifiedBlock(ps, caster, { kind: "enemy" }, [])).toEqual({ state: "Умиротворений" });
  });

  it("без стану — не блокує", () => {
    expect(pacifiedBlock(ps, ps[1], { kind: "enemy" }, ["e"])).toBeNull();
  });
});

describe("pacified: шкода", () => {
  const spell: CastableSpell = {
    id: "sp",
    name: "Синтетичний",
    level: 0,
    groupId: null,
    definition: { dice: 0, cost: "action", targeting: { kind: "self" }, resolution: { kind: "auto" }, effects: [{ kind: "dealDamage", amount: 7, damageType: "fire" }], raceModifiers: [] },
  };

  const hpAfter = (c: BattleParticipant) => {
    const foe = makeParticipant({ id: "f", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

    const r = castSpell({ caster: c, spell: { ...spell, definition: { ...spell.definition, targeting: { kind: "enemy" } } }, targetIds: ["f"], allParticipants: [c, foe], currentRound: 1, battleId: "b", diceRolls: [], rng: () => 0.4 });

    return r.allParticipantsUpdated.find((p) => p.basicInfo.id === "f")!.combatStats.currentHp;
  };

  it("шкода заклинання кастера з no_damage_dealt = 0", () => {
    const plain = makeParticipant({ id: "c" });

    expect(hpAfter(plain)).toBe(43);
    expect(hpAfter(pacify(plain))).toBe(50);
  });

  it("зона кастера з no_damage_dealt не шкодить, жива — шкодить", () => {
    const zone: TerrainCell = { kind: "hazard", label: "Зона", damage: { amount: 5, type: "fire", casterId: "c" } };

    const victim = createMockParticipant();

    const live = hazardHit(victim, zone, 1, [makeParticipant({ id: "c" })], () => 0);

    const calm = hazardHit(victim, zone, 1, [pacify(makeParticipant({ id: "c" }))], () => 0);

    expect(live?.damage).toBe(5);
    expect(calm?.damage).toBe(0);
    expect(calm?.message).toContain("не завдає шкоди");
  });

  it("атака носія no_damage_dealt не зменшує HP цілі", async () => {
    const base = createMockParticipant();

    const mk = (marked: boolean) => {
      const hero = createMockParticipant({
        basicInfo: { ...base.basicInfo, id: "hero", controlledBy: "user-1" },
        battleData: { ...base.battleData, attacks: [{ id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }] },
      });

      const gob = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "gob", side: ParticipantSide.ENEMY, controlledBy: "dm" }, combatStats: { ...base.combatStats, maxHp: 100, currentHp: 100 } });

      return {
        scene: { id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 2, eventSeq: 3, pendingMoraleCheck: null, pendingCritChoice: null, startedAt: null, completedAt: null },
        participants: [marked ? { ...hero, battleData: { ...hero.battleData, activeEffects: [{ id: "e", name: "М", type: "condition", duration: 3, effects: [{ type: "no_damage_dealt", value: 1 }] }] } } : hero, gob],
        pending: [],
        meta: { map: null },
        userId: "user-1",
        isDM: false,
      } as unknown as BattleMutationContext;
    };

    const run = async (marked: boolean) => (await attackMutation(mk(marked), attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 15, damageRolls: [8] }))).participants.find((p) => p.basicInfo.id === "gob")!.combatStats.currentHp;

    expect(await run(false)).toBeLessThan(100);
    expect(await run(true)).toBe(100);
  });
});
