import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS, type CriticalEffect } from "@/lib/constants/critical-effects";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveRetaliation, type RetaliationInput } from "@/lib/utils/battle/attack/retaliation";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const bow: BattleAttack = { id: "bw", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d6", damageType: "piercing" };

function unit(id: string, opts: { side?: ParticipantSide; hp?: number; attacks?: BattleAttack[]; abilities?: ResolvedAbility[] } = {}): BattleParticipant {
  const p = makeParticipant({ id, side: opts.side, hp: opts.hp ?? 30, maxHp: 30, abilities: opts.abilities });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT }, battleData: { ...p.battleData, attacks: opts.attacks ?? [sword] } };
}

const attacker = (over: Parameters<typeof unit>[1] = {}) => unit("a", over);

const defender = (over: Parameters<typeof unit>[1] = {}) => unit("d", { side: ParticipantSide.ENEMY, ...over });

function retaliate(a: BattleParticipant, d: BattleParticipant, over: Partial<RetaliationInput> = {}, others: BattleParticipant[] = []) {
  return resolveRetaliation({
    participants: [a, d, ...others],
    attackerId: a.basicInfo.id,
    defenderId: d.basicInfo.id,
    attack: sword,
    attackRoll: { isCriticalFail: false },
    round: 1,
    battleId: "b1",
    rng: seq(0.85),
    ...over,
  });
}

const find = (ps: BattleParticipant[] | undefined, id: string) => ps?.find((p) => p.basicInfo.id === id);

const counter = (attackKinds: ("melee" | "ranged")[], bonusPercent: number) =>
  resolved({ id: `c-${bonusPercent}`, trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds, bonusPercent }] });

describe("resolveRetaliation", () => {
  it("влучання: атакувальник втрачає HP; реакцію витрачено, дію — ні; подія «Відсіч»", () => {
    const r = retaliate(attacker(), defender());

    expect(find(r?.participants, "a")?.combatStats.currentHp).toBeLessThan(30);
    expect(find(r?.participants, "d")?.actionFlags).toMatchObject({ hasUsedReaction: true, hasUsedAction: false });
    expect(r?.battleAction).toMatchObject({ actionType: "retaliation", actorId: "d", targets: [{ participantId: "a" }], actionDetails: { isHit: true, weaponName: "Меч" } });
    expect(r?.battleAction.resultText.startsWith("Відсіч")).toBe(true);
    expect(r?.battleAction.hpChanges).toContainEqual(expect.objectContaining({ participantId: "a" }));
  });

  it("промах відсічі — подія без шкоди", () => {
    const r = retaliate(attacker(), defender(), { rng: seq(0.05) });

    expect(r?.battleAction.actionDetails.isHit).toBe(false);
    expect(find(r?.participants, "a")?.combatStats.currentHp).toBe(30);
  });

  it("критичний промах атакувальника або крит «ігнорує реакції» — відсічі немає", () => {
    const ignore = CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "ignore_reactions") as CriticalEffect;

    expect(retaliate(attacker(), defender(), { attackRoll: { isCriticalFail: true } })).toBeNull();
    expect(retaliate(attacker(), defender(), { criticalEffect: ignore })).toBeNull();
  });

  it("ціль без свідомості, атакувальник упав або реакцію вже витрачено — відсічі немає", () => {
    const down = defender();

    expect(retaliate(attacker(), { ...down, combatStats: { ...down.combatStats, status: "unconscious", currentHp: 0 } })).toBeNull();

    const dead = attacker();

    expect(retaliate({ ...dead, combatStats: { ...dead.combatStats, status: "dead", currentHp: 0 } }, defender())).toBeNull();
    expect(retaliate(attacker(), { ...down, actionFlags: { ...down.actionFlags, hasUsedReaction: true } })).toBeNull();
  });

  it("дальня атака: без counterAttack(ranged) — немає; з ним — першою дальньою атакою цілі", () => {
    expect(retaliate(attacker({ attacks: [bow] }), defender({ attacks: [sword, bow] }), { attack: bow })).toBeNull();

    const r = retaliate(attacker({ attacks: [bow] }), defender({ attacks: [sword, bow], abilities: [counter(["ranged"], 0)] }), { attack: bow });

    expect(r?.battleAction.actionDetails).toMatchObject({ weaponName: "Лук", attackKind: "ranged" });
  });

  it("немає атаки потрібного виду або її заблоковано — відсічі немає", () => {
    expect(retaliate(attacker(), defender({ attacks: [bow] }))).toBeNull();

    const d = defender();

    const blocked = { ...d, battleData: { ...d.battleData, activeEffects: [{ id: "x", name: "Скутість", type: "debuff", duration: 1, effects: [{ type: "disable_melee_attacks" }] } as never] } };

    expect(retaliate(attacker(), blocked)).toBeNull();
  });

  it("counterAttack.bonusPercent — +% до шкоди відсічі і крок «Контратака»", () => {
    const plain = retaliate(attacker(), defender());

    const boosted = retaliate(attacker(), defender({ abilities: [counter(["melee"], 50)] }));

    const lost = (r: typeof plain) => 30 - (find(r?.participants, "a")?.combatStats.currentHp ?? 30);

    expect(lost(boosted)).toBe(Math.floor(lost(plain) * 1.5));
    expect(boosted?.battleAction.actionDetails.damageSteps?.a).toContainEqual(expect.objectContaining({ label: "Контратака", value: 1.5 }));
  });

  it("тригери «перед/після атаки» захисника не спрацьовують, «влучання» — так", () => {
    const before = resolved({ id: "before", trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "dealDamage", amount: 5, target: "eventTarget" }] });

    const bleed = resolved({ id: "bleed", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: 2, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] });

    const plain = retaliate(attacker(), defender());

    const r = retaliate(attacker(), defender({ abilities: [before, bleed] }));

    expect(find(r?.participants, "a")?.combatStats.currentHp).toBe(find(plain?.participants, "a")?.combatStats.currentHp);
    expect(find(r?.participants, "a")?.battleData.activeEffects[0]?.dotDamage).toEqual({ damagePerRound: 2, damageType: "bleed" });
  });

  it("атакувальник гине від відсічі — kill-події (мораль його союзників)", () => {
    const mourn = resolved({ id: "mourn", trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] });

    const ally = unit("a2", { abilities: [mourn] });

    const r = retaliate(attacker({ hp: 1 }), defender(), {}, [ally]);

    expect(find(r?.participants, "a")?.combatStats.status).not.toBe("active");
    expect(find(r?.participants, "a2")?.combatStats.morale).toBe(-1);
  });

  it("вільний текст кубиків («2d6 + STR») кидає дві кістки, а не 0", () => {
    const calls = (dice: string) => {
      let n = 0;

      retaliate(attacker(), defender({ attacks: [{ ...sword, damageDice: dice }] }), { rng: () => (n++, 0.85) });

      return n;
    };

    expect(calls("2d6 + STR") - calls("1d6")).toBe(1);
  });

  it("consumes the defender's ownAttack effect and the attacker's attackAgainst effect", () => {
    const e = (id: string, consumeOn: "ownAttack" | "attackAgainst") => ({ id, name: id, type: "buff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], consumeOn }) as never;

    const a = attacker();

    const d = defender();

    const r = retaliate(
      { ...a, battleData: { ...a.battleData, activeEffects: [e("mark", "attackAgainst")] } },
      { ...d, battleData: { ...d.battleData, activeEffects: [e("adv", "ownAttack")] } },
    );

    expect(find(r?.participants, "d")?.battleData.activeEffects).toEqual([]);
    expect(find(r?.participants, "a")?.battleData.activeEffects).toEqual([]);
  });

  describe("провокація та нат.1 на відсічі", () => {
    const provoke = CRITICAL_FAIL_EFFECTS.find((e) => e.effect.type === "provoke_opportunity_attack") as CriticalEffect;

    const provoked = { attackRoll: { isCriticalFail: true }, criticalEffect: provoke, provoked: true };

    const withFlags = (d: BattleParticipant, flags: Partial<BattleParticipant["actionFlags"]>) => ({ ...d, actionFlags: { ...d.actionFlags, ...flags } });

    it("нат.1 з провокацією: відсіч є, реакцію не витрачено, навіть якщо вона вже була", () => {
      const r = retaliate(attacker(), defender(), provoked);

      expect(r).not.toBeNull();
      expect(find(r?.participants, "d")?.actionFlags.hasUsedReaction).toBe(false);
      expect(retaliate(attacker(), withFlags(defender(), { hasUsedReaction: true }), provoked)).not.toBeNull();
    });

    it("без provoked нат.1 атакувальника відсічі не дає", () => {
      expect(retaliate(attacker(), defender(), { attackRoll: { isCriticalFail: true }, criticalEffect: provoke })).toBeNull();
    });

    it("маркер no_reaction, відсутня атака потрібного виду або мертвий атакувальник — відсічі немає", () => {
      const d = defender();

      const silenced = { ...d, battleData: { ...d.battleData, activeEffects: [{ id: "n", name: "Без реакції", type: "debuff", duration: 1, effects: [{ type: "no_reaction" }] } as never] } };

      expect(retaliate(attacker(), silenced, provoked)).toBeNull();
      expect(retaliate(attacker(), defender({ attacks: [bow] }), provoked)).toBeNull();

      const dead = attacker();

      expect(retaliate({ ...dead, combatStats: { ...dead.combatStats, status: "dead", currentHp: 0 } }, defender(), provoked)).toBeNull();
    });

    it("нат.1 на відсічі: ефект падіння на захиснику і подія з критичним ефектом", () => {
      const r = retaliate(attacker(), defender(), { rng: seq(0, 0.5, 0.15) });

      expect(find(r?.participants, "d")?.battleData.activeEffects.some((e) => e.name === "Падіння")).toBe(true);
      expect(r?.battleAction.actionDetails.criticalEffect).toMatchObject({ id: 2, type: "fail" });
    });

    it("нат.1 на відсічі з ефектом 7 нової відсічі не викликає", () => {
      const r = retaliate(attacker(), defender(), { rng: seq(0, 0.5, 0.65) });

      expect(r?.battleAction.actionDetails.criticalEffect).toMatchObject({ id: 7 });
      expect(find(r?.participants, "d")?.battleData.activeEffects).toEqual([]);
      expect(find(r?.participants, "a")?.combatStats.currentHp).toBe(30);
    });

    it("крит-успіх «вільна атака» на відсічі не додає захиснику додаткових дій", () => {
      const free = CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "free_attack") as CriticalEffect;

      const r = retaliate(attacker(), defender(), { rng: seq(0.95, 0.5, (free.id - 0.5) / 10) });

      expect(r?.battleAction.actionDetails).toMatchObject({ isCritical: true, criticalEffect: { id: free.id } });
      expect(find(r?.participants, "d")?.battleData.pendingExtraActions ?? 0).toBe(0);
    });
  });
});
