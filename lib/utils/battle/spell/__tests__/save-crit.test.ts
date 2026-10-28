import { describe, expect, it, vi } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { SAVE_FAIL_EFFECTS, SAVE_SUCCESS_EFFECTS } from "@/lib/constants/save-critical-effects";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { createCritGate } from "@/lib/utils/battle/crit-choice/gate";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { mulberry32 } from "@/lib/utils/common/rng";
import type { BattleParticipant } from "@/types/battle";

const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const spellOf = (effects: Effect[], onSuccess: "half" | "none" = "half"): CastableSpell => ({
  id: "sp",
  name: "Заклинання",
  level: 1,
  groupId: "chaos",
  definition: { dice: 2, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "save", ability: "dexterity", onSuccess }, effects, raceModifiers: [], },
});

const caster = (): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };
};

const enemy = (id: string) => makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

const effectByType = (list: typeof SAVE_FAIL_EFFECTS, type: string) => list.find((e) => e.effect.type === type)!;

const withSaveMod = (p: BattleParticipant, mod = 0): BattleParticipant => ({ ...p, abilities: { ...p.abilities, modifiers: { ...p.abilities.modifiers, dexterity: mod } } });

function cast(spell: CastableSpell, rolls: Record<string, number>, crit?: CritPicker, opts: { dc?: number; saveMod?: number } = {}) {
  const c = caster();

  if (opts.dc !== undefined) c.spellcasting = { ...c.spellcasting, spellSaveDC: opts.dc };

  const ids = Object.keys(rolls);

  return castSpell({
    caster: c,
    spell,
    targetIds: ids,
    allParticipants: [c, ...ids.map((id) => withSaveMod(enemy(id), opts.saveMod))],
    currentRound: 1,
    battleId: "b",
    diceRolls: [3, 3],
    saveRolls: ids.map((participantId) => ({ participantId, roll: rolls[participantId] })),
    rng: seq(0.5),
    crit,
  });
}

const get = (r: ReturnType<typeof cast>, id: string) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)!;

const picking = (list: typeof SAVE_FAIL_EFFECTS, type: string): CritPicker => () => effectByType(list, type);

describe("криті на рятівних кидках заклинань", () => {
  it("нат. 20 + negate_damage: шкоди 0 навіть при half", () => {
    const r = cast(spellOf([fire]), { e1: 20 }, picking(SAVE_SUCCESS_EFFECTS, "negate_damage"));

    expect(get(r, "e1").combatStats.currentHp).toBe(200);
    expect(r.messages.join("\n")).toContain("Повне уникнення");
  });

  it("без crit нат. 20 при half: половина шкоди", () => {
    expect(get(cast(spellOf([fire]), { e1: 20 }), "e1").combatStats.currentHp).toBe(197);
  });

  it("нат. 20 + ac_buff: ціль отримує ефект КЗ", () => {
    const r = cast(spellOf([fire]), { e1: 20 }, picking(SAVE_SUCCESS_EFFECTS, "ac_buff"));

    expect(get(r, "e1").battleData.activeEffects.some((e) => e.id.includes("ac-buff"))).toBe(true);
    expect(get(r, "e1").combatStats.currentHp).toBe(197);
  });

  it("нат. 1 + double_damage: шкода ×2 проти звичайного провалу", () => {
    const plain = get(cast(spellOf([fire]), { e1: 1 }), "e1").combatStats.currentHp;

    const doubled = get(cast(spellOf([fire]), { e1: 1 }, picking(SAVE_FAIL_EFFECTS, "double_damage")), "e1").combatStats.currentHp;

    expect(200 - doubled).toBe((200 - plain) * 2);
  });

  it("нат. 1 + prone: ціль лежить", () => {
    const r = cast(spellOf([fire]), { e1: 1 }, picking(SAVE_FAIL_EFFECTS, "prone"));

    expect(get(r, "e1").battleData.activeEffects.some((e) => e.id.includes("prone"))).toBe(true);
  });

  it("negate_effects: дот заклинання не накладається, шкода лишається", () => {
    const dot: Effect = { kind: "dot", damagePerRound: { spellRoll: 50 }, damageType: "fire", duration: { rounds: 3 } };

    const plain = cast(spellOf([fire, dot]), { e1: 20 });

    expect(get(plain, "e1").battleData.activeEffects.some((e) => e.dotDamage)).toBe(true);

    const r = cast(spellOf([fire, dot]), { e1: 20 }, picking(SAVE_SUCCESS_EFFECTS, "negate_effects"));

    expect(get(r, "e1").battleData.activeEffects.some((e) => e.dotDamage)).toBe(false);
    expect(get(r, "e1").combatStats.currentHp).toBe(197);
  });

  it("нат. 20 проти недосяжної СК — успіх (половина шкоди), picker отримує success", () => {
    const crit = vi.fn(picking(SAVE_SUCCESS_EFFECTS, "ac_buff"));

    const r = cast(spellOf([fire]), { e1: 20 }, crit, { dc: 30 });

    expect(crit).toHaveBeenCalledWith(expect.objectContaining({ kind: "success" }));
    expect(r.messages.join("\n")).toContain("успіх, половина");
    expect(get(r, "e1").combatStats.currentHp).toBe(197);
    expect(r.battleAction.actionDetails.savingThrows?.[0].result).toBe("success");
  });

  it("нат. 1 з великим модифікатором проти низької СК — провал, повна шкода", () => {
    const r = cast(spellOf([fire]), { e1: 1 }, picking(SAVE_FAIL_EFFECTS, "prone"), { dc: 5, saveMod: 10 });

    expect(r.messages.join("\n")).toContain("провал");
    expect(get(r, "e1").combatStats.currentHp).toBe(194);
    expect(r.battleAction.actionDetails.savingThrows?.[0].result).toBe("fail");
  });

  it("нат. 1 проти Легендарного опору: опір спрацьовує, крит провалу не застосовується", () => {
    const crit = vi.fn(picking(SAVE_FAIL_EFFECTS, "prone"));

    const spell = spellOf([fire]);

    const c = caster();

    const boss = withSaveMod(enemy("e1"));

    const target = { ...boss, battleData: { ...boss.battleData, legendary: { actions: 0, actionsLeft: 0, resistLeft: 1 } } };

    const r = castSpell({ caster: c, spell, targetIds: ["e1"], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [3, 3], saveRolls: [{ participantId: "e1", roll: 1 }], rng: seq(0.5), crit });

    expect(get(r as ReturnType<typeof cast>, "e1").battleData.legendary?.resistLeft).toBe(0);
    expect(r.battleAction.actionDetails.savingThrows?.[0].result).toBe("success");
    expect(get(r as ReturnType<typeof cast>, "e1").battleData.activeEffects.some((e) => e.id.includes("prone"))).toBe(false);
  });

  it("кидок 10 не викликає picker", () => {
    const crit = vi.fn(picking(SAVE_FAIL_EFFECTS, "prone"));

    cast(spellOf([fire]), { e1: 10 }, crit);

    expect(crit).not.toHaveBeenCalled();
  });

  it("три цілі з нат. 1: три тригери з унікальними ключами", () => {
    const gate = createCritGate({ rng: mulberry32(3) });

    cast(spellOf([fire]), { e1: 1, e2: 1, e3: 1 }, gate.pick);

    expect(gate.triggers.map((t) => t.key)).toEqual(["save:c:e1:0", "save:c:e2:0", "save:c:e3:0"]);
  });
});
