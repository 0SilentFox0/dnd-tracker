import type { Spell } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { SPELLS } from "@/data/library/spells";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { processAttack } from "@/lib/utils/battle/attack";
import { runAttackPhase } from "@/lib/utils/battle/attack-phase/run-attack-phase";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { castSpell } from "@/lib/utils/battle/spell";
import { computeSpellPower } from "@/lib/utils/battle/spell/power";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { BattleRuleError } from "@/lib/utils/battle/store";
import { endTurnCleanup } from "@/lib/utils/battle/turn/end-turn-cleanup";
import { calculateInitiative } from "@/lib/utils/battle/turn/initiative";
import { runAdvanceTurnLoop } from "@/lib/utils/battle/turn/run-advance-turn-loop";
import { processStartOfTurn } from "@/lib/utils/battle/turn/start-end";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const spell = (key: string): CastableSpell => {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(`no spell ${key}`);

  return { id: key, name: s.name, level: s.level, groupId: "dark", definition: { ...s.definition, raceModifiers: [] } };
};

const claw = { id: "claw", name: "Кіготь", type: "melee", attackBonus: 5, damageDice: "1d10", damageType: "slashing", targetType: "single" } as unknown as BattleAttack;

const bow = { ...claw, id: "bow", name: "Лук", type: "ranged" } as unknown as BattleAttack;

const slots = Object.fromEntries([1, 2, 3, 4, 5].map((l) => [String(l), { max: 5, current: 5 }]));

function hero(id = "mage"): BattleParticipant {
  const p = makeParticipant({ id, hp: 100, maxHp: 100 });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: "user-1" }, spellcasting: { ...p.spellcasting, spellSlots: slots, spellSaveDC: 15 }, battleData: { ...p.battleData, attacks: [claw] } };
}

function unit(id: string, side: ParticipantSide = ParticipantSide.ENEMY, over: { init?: number } = {}): BattleParticipant {
  const p = makeParticipant({ id, side, hp: 100, maxHp: 100 });

  const init = over.init ?? 10;

  return {
    ...p,
    basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT, controlledBy: "dm" },
    abilities: { ...p.abilities, initiative: init, baseInitiative: init },
    combatStats: { ...p.combatStats, armorClass: 14 },
    spellcasting: { ...p.spellcasting, spellSlots: { universal: { max: 5, current: 5 } } },
    battleData: { ...p.battleData, attacks: [claw, bow] },
  };
}

const find = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

function cast(key: string, targetIds: string[], ps: BattleParticipant[], opts: { dice?: number[]; save?: number; casterId?: string } = {}) {
  const c = find(ps, opts.casterId ?? "mage");

  return castSpell({
    caster: c,
    spell: spell(key),
    targetIds,
    allParticipants: ps,
    currentRound: 1,
    battleId: "b",
    diceRolls: opts.dice ?? [],
    saveRolls: targetIds.map((participantId) => ({ participantId, roll: opts.save ?? 1 })),
    rng: seq(0.5),
  });
}

/** n full turns of `id`: start of turn (seen = state during the turn), then end-of-turn cleanup. */
function turnsOf(ps: BattleParticipant[], id: string, n: number, rng = seq(0.99)) {
  const seen: BattleParticipant[] = [];

  let order = ps;

  for (let i = 0; i < n; i++) {
    const r = processStartOfTurn(find(order, id), i + 2, order, rng);

    order = r.participants;
    seen.push(find(order, id));
    order = updateParticipant(order, id, endTurnCleanup);
  }

  return { order, seen };
}

function hit(attacker: BattleParticipant, target: BattleParticipant, ps: BattleParticipant[], d20 = 15, dmg = [8], attack = claw) {
  return processAttack({ attacker, target, attack, d20Roll: d20, damageRolls: dmg, allParticipants: ps, currentRound: 1, battleId: "b", rng: seq(0.5) });
}

const dealt = (r: ReturnType<typeof hit>) => r.damage?.finalDamage ?? 0;

const world = () => [hero(), unit("orc"), unit("gob")];

describe("Темрява — бібліотечні заклинання", () => {
  it("Ослаблення: рятівний кидок саме Мудрості, успіх — без ефекту", () => {
    const ps = world();

    const wise = { ...find(ps, "orc"), abilities: { ...find(ps, "orc").abilities, modifiers: { ...find(ps, "orc").abilities.modifiers, wisdom: 10, strength: 0 } } };

    const r = cast("weakness", ["orc"], [ps[0], wise, ps[2]], { save: 6 });

    expect(r.battleAction.actionDetails.savingThrows?.[0]).toMatchObject({ ability: "wisdom", result: "success" });
    expect(find(r.allParticipantsUpdated, "orc").battleData.activeEffects).toHaveLength(0);
  });

  it("Ослаблення: −25 % шкоди зброєю і заклинаннями ворога", () => {
    const ps = cast("weakness", ["orc"], world()).allParticipantsUpdated;

    const orc = find(ps, "orc");

    const base = dealt(hit(unit("orc"), hero(), world(), 15, [8]));

    const weak = dealt(hit(orc, find(ps, "mage"), ps, 15, [8]));

    expect(weak).toBeLessThan(base);
    expect(weak).toBeGreaterThanOrEqual(Math.floor(base * 0.75) - 1);

    const power = computeSpellPower({ caster: orc, groupId: "chaos", rolls: [10, 10], participants: ps });

    expect(power.damage).toBe(15);
  });

  it("Ослаблення: «3 раунди» — діє на 3 ходи цілі", () => {
    const ps = cast("weakness", ["orc"], world()).allParticipantsUpdated;

    const { seen } = turnsOf(ps, "orc", 3);

    const active = seen.filter((o) => collectModifiers([o], "orc", { damage: { kind: "weapon" } } as never).percent < 0).length;

    expect(active).toBe(3);
  });

  it("Сповільнення: −3 ініціативи змінює чергу на наступному раунді", () => {
    const fast = unit("orc", ParticipantSide.ENEMY, { init: 12 });

    const slowGob = unit("gob", ParticipantSide.ENEMY, { init: 11 });

    const ps = cast("slow", ["orc"], [hero(), fast, slowGob]).allParticipantsUpdated;

    expect(calculateInitiative(find(ps, "orc"), ps)).toBe(9);

    const loop = runAdvanceTurnLoop({ initiativeOrder: ps, currentTurnIndex: 2, currentRound: 1, battleId: "b", currentBattleLogLength: 0, pendingSummons: [], rng: seq(0.99) });

    const ids = loop.updatedInitiativeOrder.map((p) => p.basicInfo.id);

    expect(ids.indexOf("gob")).toBeLessThan(ids.indexOf("orc"));
  });

  it("Немічність: три накладання — −6 AC у кидку на влучання; четверте оновлює найстаріше", () => {
    let ps = world();

    for (let i = 0; i < 3; i++) ps = cast("frailty", ["orc"], ps).allParticipantsUpdated;

    // AC 14 − 6 = 8: d20 1… бонус 9 — беремо d20 2 → 11 < 14, але ≥ 8
    expect(hit(find(ps, "mage"), find(ps, "orc"), ps, 2).success).toBe(true);
    expect(hit(hero(), unit("orc"), world(), 2).success).toBe(false);

    ps = turnsOf(ps, "orc", 1).order;
    ps = cast("frailty", ["orc"], ps).allParticipantsUpdated;

    const frail = find(ps, "orc").battleData.activeEffects.filter((e) => e.name === "Немічність");

    expect(frail).toHaveLength(3);
    expect(frail.map((e) => e.duration).sort()).toEqual([2, 2, 3]);
  });

  it("Чума: тікає на початку ходу цілі 2 рази кидком каста", () => {
    const ps = cast("plague", ["orc"], world(), { dice: [5] }).allParticipantsUpdated;

    const { seen } = turnsOf(ps, "orc", 3);

    expect(seen.map((o) => o.combatStats.currentHp)).toEqual([95, 90, 90]);
  });

  it("Чума: опір отруті 50 % зменшує щораундову шкоду", () => {
    const base = world();

    const orc = find(base, "orc");

    const resistant: BattleParticipant = {
      ...orc,
      battleData: {
        ...orc.battleData,
        resolvedAbilities: [{ id: "r", name: "Опір отруті", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "poison", percent: 50 }], key: "skill:r:r", source: { type: "skill", id: "r", name: "Опір" } }] as never,
      },
    };

    expect(applyResistance(resistant, 6, "poison", { participants: [resistant] }).finalDamage).toBe(3);

    const ps = cast("plague", ["orc"], [base[0], resistant, base[2]], { dice: [6] }).allParticipantsUpdated;

    const { seen } = turnsOf(ps, "orc", 1);

    expect(seen[0].combatStats.currentHp).toBe(97);
  });

  it("Розсіяність: 2 ходи цілі з шансом 50 % втрачає дію", () => {
    const ps = cast("confusion", ["orc"], world()).allParticipantsUpdated;

    const lose = turnsOf(ps, "orc", 3, seq(0.1)).seen.map((o) => o.actionFlags.hasUsedAction);

    expect(lose).toEqual([true, true, false]);

    const keep = turnsOf(ps, "orc", 2, seq(0.9)).seen.map((o) => o.actionFlags.hasUsedAction);

    expect(keep).toEqual([false, false]);
  });

  it("Страждання: −3 до кидка атаки ворога", () => {
    const ps = cast("suffering", ["orc"], world()).allParticipantsUpdated;

    // бонус 5 + СИЛ 2 + майстерність 2 = 9; AC 14: d20 6 → 15 влучає, з −3 = 12 — ні
    expect(hit(unit("orc"), hero(), world(), 6).success).toBe(true);
    expect(hit(find(ps, "orc"), find(ps, "mage"), ps, 6).success).toBe(false);
  });

  it("Смуток: −2 до ефективної моралі", () => {
    const ps = cast("sorrow", ["orc"], world()).allParticipantsUpdated;

    expect(effectiveMorale(find(ps, "orc"), ps).value).toBe(-2);
  });

  describe("Сліпота", () => {
    const blinded = () => cast("blindness", ["orc"], world()).allParticipantsUpdated;

    it("рятівний кидок Статури", () => {
      expect(cast("blindness", ["orc"], world()).battleAction.actionDetails.savingThrows?.[0].ability).toBe("constitution");
    });

    it("сліпий ворог не може атакувати у свій хід (ближній бій)", () => {
      const ps = turnsOf(blinded(), "orc", 1).order;

      const order = [find(ps, "orc"), find(ps, "mage"), find(ps, "gob")];

      expect(() => runAttackPhase({ battle: { initiativeOrder: order, battleLog: [], currentRound: 2, currentTurnIndex: 0 }, data: { attackerId: "orc", targetId: "mage", d20Roll: 15, damageRolls: [5], attackId: "claw" }, battleId: "b", userId: "dm", isDM: true, rng: seq(0.5) })).toThrow();
    });

    it("сліпий ворог не може атакувати здалеку", () => {
      const ps = turnsOf(blinded(), "orc", 1).order;

      const order = [find(ps, "orc"), find(ps, "mage"), find(ps, "gob")];

      expect(() => runAttackPhase({ battle: { initiativeOrder: order, battleLog: [], currentRound: 2, currentTurnIndex: 0 }, data: { attackerId: "orc", targetId: "mage", d20Roll: 15, damageRolls: [5], attackId: "bow" }, battleId: "b", userId: "dm", isDM: true, rng: seq(0.5) })).toThrow();
    });

    it("сліпий ворог не може чаклувати (spell-mutation) — обидва свої ходи", async () => {
      const row = { id: "x", campaignId: "c1", name: "Стріла", level: 1, groupId: null, icon: null, dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: [], raceModifiers: [], stackable: false, maxStacks: null } as unknown as Spell;

      const mutation = createSpellMutation({ loadSpell: async () => row, loadPool: async () => [] } as never);

      const { seen } = turnsOf(blinded(), "orc", 2);

      const scene = { id: "b", campaignId: "c1", status: "active", round: 2, turnIndex: 0, version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null } as BattleSceneState;

      const blocked = await Promise.all(
        seen.map((orc) => {
          const ctx = { scene, meta: {}, participants: [orc, hero()], pending: [], userId: "dm", isDM: true, rng: seq(0.5) } as unknown as BattleMutationContext;

          return mutation(ctx, { casterId: "orc", spellId: "x", targetIds: ["mage"], diceRolls: [], preview: false } as never).then(() => false, (e) => e instanceof BattleRuleError);
        }),
      );

      expect(blocked).toEqual([true, true]);
    });

    it("спадає, щойно ворог отримує шкоду", () => {
      const ps = blinded();

      const r = hit(find(ps, "mage"), find(ps, "orc"), ps, 18);

      const orc = find(r.allParticipantsUpdated ?? [], "orc");

      expect(orc.battleData.activeEffects.filter((e) => e.name === "Сліпота")).toHaveLength(0);
    });
  });

  it("Шал: юніт б'є випадкову іншу істоту з +50 %; на героя не діє", () => {
    const ps = cast("berserk", ["orc"], world()).allParticipantsUpdated;

    expect(find(ps, "orc").battleData.activeEffects[0].effects[0]).toEqual({ type: "berserk", value: 50 });

    const enemyHero = { ...hero("h"), basicInfo: { ...hero("h").basicInfo, side: ParticipantSide.ENEMY } };

    expect(find(cast("berserk", ["h"], [hero(), enemyHero]).allParticipantsUpdated, "h").battleData.activeEffects).toHaveLength(0);

    const loop = runAdvanceTurnLoop({ initiativeOrder: [find(ps, "mage"), find(ps, "orc"), find(ps, "gob")], currentTurnIndex: 0, currentRound: 1, battleId: "b", currentBattleLogLength: 0, pendingSummons: [], rng: seq(0.99, 0.99, 0.5) });

    expect(find(loop.updatedInitiativeOrder, "gob").combatStats.currentHp).toBeLessThan(100);
    expect(loop.newLogEntries.some((e) => e.resultText.includes("Шал"))).toBe(true);
  });

  it("Ляльковод: ворог 1 хід на боці заклинателя під контролем його гравця, потім повертається", () => {
    const ps = cast("puppet-master", ["orc"], world()).allParticipantsUpdated;

    const orc = find(ps, "orc");

    expect(orc.basicInfo.side).toBe(ParticipantSide.ALLY);
    expect(orc.basicInfo.controlledBy).toBe("user-1");

    const start = processStartOfTurn(orc, 2, ps, seq(0.5));

    expect(start.participant.basicInfo.side).toBe(ParticipantSide.ALLY);

    expect(endTurnCleanup(start.participant).basicInfo).toMatchObject({ side: ParticipantSide.ENEMY, controlledBy: "dm" });
  });

  it("Вампіризм: атаки союзника лікують на 50 % завданої шкоди", () => {
    const base = world();

    const ally = { ...unit("ally", ParticipantSide.ALLY), combatStats: { ...unit("ally").combatStats, currentHp: 50 } };

    const ps = cast("vampirism", ["ally"], [base[0], ally, base[1]]).allParticipantsUpdated;

    const r = hit(find(ps, "ally"), find(ps, "orc"), ps, 18, [8]);

    expect(find(r.allParticipantsUpdated ?? [], "ally").combatStats.currentHp).toBe(50 + Math.floor(dealt(r) / 2));
  });

  it("Прокляття Потойбіччя: шкода всім ворогам і −1 мораль", () => {
    const ps = world();

    const r = castSpell({ caster: ps[0], spell: spell("curse-of-the-netherworld"), targetIds: ["orc", "gob"], allParticipants: ps, currentRound: 1, battleId: "b", diceRolls: [3, 3, 3, 3], rng: seq(0.5) });

    for (const id of ["orc", "gob"]) {
      const p = find(r.allParticipantsUpdated, id);

      expect(p.combatStats.currentHp).toBeLessThan(100);
      expect(p.combatStats.morale).toBe(-1);
    }
  });

  it("тривалість «2 раунди» для умов контролю (Сліпота) — 2 ходи цілі без атак", () => {
    const { seen } = turnsOf(cast("blindness", ["orc"], world()).allParticipantsUpdated, "orc", 2);

    expect(seen.map((o) => o.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === "disable_melee_attacks")))).toEqual([true, true]);
  });
});
