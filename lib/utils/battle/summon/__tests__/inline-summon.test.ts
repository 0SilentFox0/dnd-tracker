import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { textOf } from "@/lib/i18n/test/text";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { isAttackable, isTargetable, takesTurn } from "@/lib/utils/abilities/engine/core/participants";
import { beginConcentration, dropConcentration } from "@/lib/utils/battle/concentration";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import { castSpell } from "@/lib/utils/battle/spell";
import { anchorMove, anchorTurnStart } from "@/lib/utils/battle/spell/anchored-zone";
import { applyAbilitySummons } from "@/lib/utils/battle/summon/ability-summons";
import { dismissExpiredSummons } from "@/lib/utils/battle/summon/dismiss";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { SpellEffect, SummonInlineEffect } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

const map: BattleMapConfig = { cols: 20, rows: 10, background: null, opacity: 0.3 };

const at = (p: BattleParticipant, position: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, position } });

const caster = () => {
  const c = at(makeParticipant({ id: "druid" }), { x: 0, y: 0 });

  return { ...c, spellcasting: { ...c.spellcasting, spellSaveDC: 14, spellAttackBonus: 6, spellSlots: { "1": { max: 3, current: 3 }, "3": { max: 2, current: 2 } } } };
};

const orc = (x = 8, y = 5) => at(makeParticipant({ id: "orc", side: ParticipantSide.ENEMY, hp: 30, maxHp: 30 }), { x, y });

const leaf: SpellEffect = { kind: "dealDamage", amount: "1d4", damageType: "slashing", target: "eventTarget" };

const bush = (over: Partial<SummonInlineEffect> = {}): SummonInlineEffect => ({
  kind: "summonInline",
  name: "Кущ",
  size: "small",
  ac: "spellDc",
  hp: null,
  count: 1,
  upcastEvery: 2,
  aura: { radiusFeet: 10, side: "enemies", onEnter: { attack: "spell", effects: [leaf as never] }, onTurnStart: { attack: "spell", effects: [leaf as never] } },
  duration: { rounds: 99 },
  ...over,
});

const spellOf = (effect: SummonInlineEffect, concentration = false): CastableSpell => ({
  id: "guard",
  name: "Синтетичний вартовий",
  level: 1,
  groupId: null,
  definition: { dice: 0, cost: "action", concentration, targeting: { kind: "template", shape: "circle", size: 5, side: "enemy", maxTargets: 1, range: 60 }, resolution: { kind: "auto" }, effects: [effect], raceModifiers: [] },
});

const rules = { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null } };

const cast = (effect = bush(), castLevel = 1, concentration = false) => {
  const c = caster();

  return castSpell({ caster: c, spell: spellOf(effect, concentration), targetIds: [], allParticipants: [c, orc()], currentRound: 2, battleId: "b", diceRolls: [], rng: () => 0.5, castLevel, map, rules });
};

const summon = async (effect = bush(), castLevel = 1, atCell: GridPoint = { x: 4, y: 5 }, concentration = false) => {
  const r = cast(effect, castLevel, concentration);

  const requests = r.summons.map((s) => ({ ...s, atCell }));

  const out = await applyAbilitySummons(requests, r.allParticipantsUpdated as BattleParticipant[], { campaignId: "c", battleId: "b", rng: () => 0.5, deps: { loadPool: async () => ({ units: [], races: [] }) }, map, round: 2 });

  return { ...out, order: out.order, summons: r.summons };
};

const bushes = (ps: BattleParticipant[]) => ps.filter((p) => p.battleData.object);

describe("summonInline: каст", () => {
  it("запит несе СК як КЗ, закінчення за тривалістю й число кущів за коло слота", () => {
    const [req] = cast(bush({ duration: { rounds: 20 } }), 3).summons;

    expect(req.inline).toMatchObject({ ac: 14, hp: null });
    expect(req.count).toBe(2);
    expect(req.expiresRound).toBe(22);
    expect(req.inline?.zone).toMatchObject({ dc: 14, radiusFeet: 10, side: "enemies", attackBonus: 6, casterId: "druid" });
  });

  it("без upcastEvery кущів стільки, скільки в count", () => {
    expect(cast(bush({ upcastEvery: undefined, count: 2 }), 3).summons[0].count).toBe(2);
  });
});

describe("summonInline: поява", () => {
  it("кущ з'являється в точці, не рухається, не ціль, не ходить", async () => {
    const { order, messages } = await summon();

    const [b] = bushes(order);

    expect(b.battleData.position).toEqual({ x: 4, y: 5 });
    expect(b.combatStats).toMatchObject({ speed: 0, armorClass: 14, status: CombatStatus.ACTIVE });
    expect(b.battleData.summonedBy).toBe("druid");
    expect(isTargetable(b)).toBe(false);
    expect(isAttackable(b)).toBe(false);
    expect(takesTurn(b, 3)).toBe(false);
    expect(textsOf(messages).join(" ")).toContain("Кущ");
    expect(b.battleData.activeEffects.find((e) => e.anchoredZone)?.anchoredZone).toMatchObject({ radiusFeet: 10, side: "enemies" });
  });

  it("кілька кущів стають на сусідні вільні клітинки", async () => {
    const { order } = await summon(bush({ count: 3 }));

    const cells = bushes(order).map((b) => `${b.battleData.position?.x},${b.battleData.position?.y}`);

    expect(new Set(cells).size).toBe(3);
    expect(new Set(bushes(order).map((b) => b.basicInfo.id)).size).toBe(3);
  });

  it("предмет не рахується в перемозі й поразці", async () => {
    const { order } = await summon();

    const dead = order.map((p) => (p.basicInfo.id === "orc" ? { ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD } } : p));

    expect(checkVictoryConditions(dead).result).toBe("victory");

    const enemyBush = bushes(order).map((b) => ({ ...b, basicInfo: { ...b.basicInfo, side: ParticipantSide.ENEMY } }));

    expect(checkVictoryConditions([...dead.filter((p) => !p.battleData.object), ...enemyBush]).result).toBe("victory");
  });
});

describe("summonInline: аура-атака", () => {
  const ctx = (round = 3, rolls: number[] = [0.9]) => {
    let i = 0;

    return { map, round, rng: () => rolls[i++ % rolls.length] };
  };

  it("ворог входить у 10 фт: атака заклинанням, на влучання — шкода", async () => {
    const { order } = await summon();

    const orcNear = orc(8, 5);

    const ps = order.map((p) => (p.basicInfo.id === "orc" ? orcNear : p));

    const moved = at(orcNear, { x: 6, y: 5 });

    const out = anchorMove({ participants: ps.map((p) => (p.basicInfo.id === "orc" ? moved : p)), moved, from: { x: 8, y: 5 }, path: [{ x: 7, y: 5 }, { x: 6, y: 5 }], ctx: ctx(3, [0.95, 0.5, 0.5]) });

    const hurt = out.participants.find((p) => p.basicInfo.id === "orc") as BattleParticipant;

    expect(textsOf(out.messages).join(" ")).toMatch(/атака 20\+6=26 проти КЗ 14: влучання/);
    expect(hurt.combatStats.currentHp).toBeLessThan(30);
  });

  it("промах не шкодить", async () => {
    const { order } = await summon();

    const moved = at(orc(8, 5), { x: 6, y: 5 });

    const out = anchorMove({ participants: order.map((p) => (p.basicInfo.id === "orc" ? moved : p)), moved, from: { x: 8, y: 5 }, path: [{ x: 6, y: 5 }], ctx: ctx(3, [0.05]) });

    expect(textsOf(out.messages).join(" ")).toContain("промах");
    expect(out.participants.find((p) => p.basicInfo.id === "orc")?.combatStats.currentHp).toBe(30);
  });

  it("початок ходу ворога біля куща теж б'є", async () => {
    const { order } = await summon();

    const near = order.map((p) => (p.basicInfo.id === "orc" ? at(p, { x: 5, y: 5 }) : p));

    const out = anchorTurnStart(near, "orc", ctx(3, [0.95, 0.5]));

    expect(out.participants.find((p) => p.basicInfo.id === "orc")?.combatStats.currentHp).toBeLessThan(30);
  });

  it("союзник кастера кущ не чіпає", async () => {
    const { order } = await summon();

    const ally = at(makeParticipant({ id: "ally", hp: 30, maxHp: 30 }), { x: 5, y: 5 });

    const out = anchorTurnStart([...order, ally], "ally", ctx());

    expect(out.messages).toEqual([]);
  });
});

describe("summonInline: зникнення", () => {
  it("зникає після закінчення тривалості: мертвий, dismissed, знятий з мапи", async () => {
    const { order } = await summon(bush({ duration: { rounds: 3 } }));

    expect(dismissExpiredSummons(order, 5).participants).toBe(order);

    const out = dismissExpiredSummons(order, 6);

    const [b] = bushes(out.participants);

    expect(b.combatStats.status).toBe(CombatStatus.DEAD);
    expect(b.battleData.dismissed).toBe(true);
    expect(b.battleData.position).toBeUndefined();
    expect(textOf(out.messages[0])).toContain("зникає");
  });

  it("зникає з утратою концентрації", async () => {
    const c = caster();

    const begun = beginConcentration([c, orc()], "druid", "cast-1", "Синтетичний вартовий", 10, 2).participants;

    const r = castSpell({ caster: begun[0], spell: spellOf(bush(), true), targetIds: [], allParticipants: begun, currentRound: 2, battleId: "b", diceRolls: [], rng: () => 0.5, map, rules });

    const built = await applyAbilitySummons(r.summons.map((s) => ({ ...s, atCell: { x: 4, y: 5 } })), r.allParticipantsUpdated as BattleParticipant[], { campaignId: "c", battleId: "b", rng: () => 0.5, deps: { loadPool: async () => ({ units: [], races: [] }) }, map, round: 2 });

    expect(dismissExpiredSummons(built.order, 3).participants).toBe(built.order);

    const dropped = dropConcentration(built.order, "druid", "тест").participants;

    expect(bushes(dismissExpiredSummons(dropped, 3).participants)[0].battleData.dismissed).toBe(true);
  });
});

describe("perObjectFeet: бонусна атака кущів", () => {
  const strike = (ps: BattleParticipant[]) => {
    const c = ps.find((p) => p.basicInfo.id === "druid") as BattleParticipant;

    const spell: CastableSpell = { id: "guard", name: "Листя", level: 0, groupId: null, definition: { dice: 0, cost: "bonusAction", targeting: { kind: "enemy" }, resolution: { kind: "attack" }, effects: [leaf as never], raceModifiers: [], perObjectFeet: 10 } };

    const r = castSpell({ caster: c, spell, targetIds: ["orc"], allParticipants: ps, currentRound: 3, battleId: "b", diceRolls: [], rng: () => 0.5, map, rules });

    return (r.allParticipantsUpdated as BattleParticipant[]).find((p) => p.basicInfo.id === "orc")?.combatStats.currentHp as number;
  };

  it("шкода — по одній 1d4 за кожен кущ у 10 фт від цілі", async () => {
    const { order } = await summon(bush({ count: 2 }), 1, { x: 7, y: 5 });

    const near = bushes(order);

    expect(near).toHaveLength(2);
    expect(30 - strike(order)).toBe(6);
    expect(30 - strike(order.filter((p) => p.basicInfo.id !== near[1].basicInfo.id))).toBe(3);
  });

  it("кущ поза 10 фт не додає кубик", async () => {
    const { order } = await summon(bush(), 1, { x: 0, y: 2 });

    expect(30 - strike(order)).toBe(0);
  });
});
