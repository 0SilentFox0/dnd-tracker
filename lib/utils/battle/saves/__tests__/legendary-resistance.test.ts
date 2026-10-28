import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { contest } from "@/lib/utils/battle/actions/grapple";
import { beginConcentration, concentrationCheck } from "@/lib/utils/battle/concentration";
import { ABILITIES, byId, hp, MAP, percentOfAttack, perform, unit } from "@/lib/utils/battle/maneuvers/__tests__/fixtures";
import { resolveSave } from "@/lib/utils/battle/saves/legendary";
import { rollSaveEnds } from "@/lib/utils/battle/saves/save-ends";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const legendaryOf = (p: BattleParticipant, resistLeft: number): BattleParticipant => ({ ...p, battleData: { ...p.battleData, legendary: { actions: 0, actionsLeft: 0, resistLeft } } });

const resistOf = (ps: BattleParticipant[], id: string) => ps.find((p) => p.basicInfo.id === id)?.battleData.legendary?.resistLeft;

describe("resolveSave", () => {
  it("провал → успіх, лічильник −1, повідомлення", () => {
    const p = legendaryOf(makeParticipant({ id: "d" }), 2);

    const r = resolveSave(p, { success: false, total: 3 });

    expect(r.result).toEqual({ success: true, total: 3 });
    expect(r.participant.battleData.legendary?.resistLeft).toBe(1);
    expect(r.message).toBe("👑 d: Легендарний опір — провал стає успіхом (1 залишилось)");
  });

  it("успіх або порожній опір — без змін", () => {
    const p = legendaryOf(makeParticipant({ id: "d" }), 1);

    const ok = { success: true };

    expect(resolveSave(p, ok)).toEqual({ result: ok, participant: p, message: null });
    expect(resolveSave(legendaryOf(p, 0), { success: false }).result.success).toBe(false);
    expect(resolveSave(makeParticipant({ id: "x" }), { success: false }).message).toBeNull();
  });
});

describe("виклики rollSave", () => {
  it("saveEnds: провалений кидок звільняє за рахунок опору", () => {
    const base = legendaryOf(makeParticipant({ id: "t" }), 1);

    const p = { ...base, battleData: { ...base.battleData, activeEffects: [makeEffect("paralyzed", { name: "paralyzed", saveEnds: { ability: "wisdom", dc: 14 } })] } };

    const r = rollSaveEnds(p, [p], undefined, seq(0.1));

    expect(r.participant.battleData.activeEffects).toHaveLength(0);
    expect(r.participant.battleData.legendary?.resistLeft).toBe(0);
    expect(r.messages[1]).toContain("Легендарний опір");
  });

  it("концентрація: опір утримує її", () => {
    const begun = beginConcentration([legendaryOf(makeParticipant({ id: "c" }), 1)], "c", "c:sp@1#0", "Сповільнення", 3);

    const caster = begun.participants[0];

    const r = concentrationCheck({ caster, damage: 10, participants: begun.participants, rules: { ...DEFAULT_RULES, concentration: { enabled: true, dcCap: null } }, rng: seq(0) });

    expect(r.participants[0].battleData.activeEffects.some((e) => e.concentration)).toBe(true);
    expect(resistOf(r.participants, "c")).toBe(0);
    expect(r.messages.join(" ")).toContain("утримує");
    expect(r.messages.join(" ")).toContain("Легендарний опір");
  });

  it("Схоплення 2024: опір цілі зриває захоплення", () => {
    const attacker = makeParticipant({ id: "a" });

    const target = legendaryOf(makeParticipant({ id: "t", side: ParticipantSide.ENEMY }), 1);

    const rules = { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true, variant: "2024" as const } };

    const r = contest({ attacker, target, participants: [attacker, target], rules, rng: () => 0.05 });

    expect(r.success).toBe(false);
    expect(resistOf(r.participants, "t")).toBe(0);
    expect(r.message).toContain("Легендарний опір");
  });

  it("Вогняний вибух: опір дає половину шкоди", () => {
    const ps = [
      unit("g", { side: ParticipantSide.ALLY, at: { x: 5, y: 5 }, abilities: [ABILITIES.fireBurst] }),
      legendaryOf(unit("e1", { at: { x: 6, y: 5 } }), 1),
      unit("e2", { at: { x: 4, y: 4 } }),
    ];

    const r = perform(ps, "fireBurst", { map: MAP, rng: () => 0 });

    const dmg = percentOfAttack(byId(r.participants, "g"), 50);

    expect(hp(r.participants, "e1")).toBe(200 - Math.floor(dmg / 2));
    expect(hp(r.participants, "e2")).toBe(200 - dmg);
    expect(resistOf(r.participants, "e1")).toBe(0);
  });

  describe("заклинання", () => {
    const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

    const spell = (targeting: CastableSpell["definition"]["targeting"]): CastableSpell => ({
      id: "sp", name: "Вогонь", level: 1, groupId: "chaos",
      definition: { dice: 2, cost: "action", targeting, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [fire], raceModifiers: [] },
    });

    const caster = () => {
      const p = makeParticipant({ id: "c" });

      return { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };
    };

    const cast = (s: CastableSpell, target: BattleParticipant) => {
      const c = caster();

      return castSpell({ caster: c, spell: s, targetIds: [target.basicInfo.id], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [3, 3], saveRolls: [{ participantId: target.basicInfo.id, roll: 1 }], rng: seq(0.5) });
    };

    it("ворог: провалений кидок стає успіхом (половина шкоди)", () => {
      const foe = legendaryOf(makeParticipant({ id: "e1", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }), 1);

      const r = cast(spell({ kind: "enemy" }), foe);

      expect(r.allParticipantsUpdated.find((p) => p.basicInfo.id === "e1")?.combatStats.currentHp).toBe(197);
      expect(resistOf(r.allParticipantsUpdated, "e1")).toBe(0);
      expect(r.battleAction.actionDetails.savingThrows?.[0].result).toBe("success");
      expect(r.battleAction.resultText).toContain("Легендарний опір");
    });

    it("ціль на боці кастера: опір не витрачається", () => {
      const friend = legendaryOf(makeParticipant({ id: "a1", hp: 200, maxHp: 200 }), 1);

      const r = cast(spell({ kind: "ally" }), friend);

      expect(resistOf(r.allParticipantsUpdated, "a1")).toBe(1);
      expect(r.battleAction.actionDetails.savingThrows?.[0].result).toBe("fail");
    });
  });
});
