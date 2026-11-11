import { describe, expect, it } from "vitest";

import { mitigateWfrpDamage } from "../mitigate";
import { wfrpAbilitiesOf } from "../participant";
import { resolveWfrpAttack } from "../resolve-attack";

import { AttackType } from "@/lib/constants/battle";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { attackOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { QUALITY_REGISTRY, type QualityRef } from "@/systems/wfrp/rules/equipment/qualities";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import { ATTACK_SLOT } from "@/systems/wfrp/rules/slots";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const withAp = (p: BattleParticipant, body: number): BattleParticipant => ({ ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, { ap: { head: 0, arm: 0, body, leg: 0 } }) } });

const baseAttack: BattleAttack = { id: "w", name: "w", type: AttackType.MELEE, attackBonus: 0, damageDice: "", damageType: "physical" };

const ctx = ({ qualities, flaws, noSb, ...extra }: { qualities?: QualityRef[]; flaws?: QualityRef[]; noSb?: boolean; crit?: boolean; attackRoll?: number; body?: number; netSl?: number } = {}) => ({
  attacker: withAp(makeParticipant({ id: "a", hp: 10, maxHp: 10 }), 0),
  target: withAp(makeParticipant({ id: "t", hp: 10, maxHp: 10 }), extra.body ?? 4),
  weapon: 4,
  amount: 5,
  margin: extra.netSl ?? 1,
  location: "body" as const,
  crit: false,
  rng: () => 0.5,
  rules: WFRP_RULES,
  attack: qualities || flaws || noSb ? { ...baseAttack, system: ATTACK_SLOT.write({ qualities: qualities ?? [], flaws: flaws ?? [], ...(noSb && { noSb }) }) } : baseAttack,
  ...extra,
});

describe("mitigateWfrpDamage qualities", () => {
  it("no qualities: identical to the plain path", () => {
    const plain = mitigateWfrpDamage(ctx());

    expect(mitigateWfrpDamage(ctx({ qualities: [], flaws: [] }))).toEqual(plain);
  });

  it("Damaging raises SL, step sits after ap", () => {
    const base = mitigateWfrpDamage(ctx());

    const r = mitigateWfrpDamage(ctx({ qualities: [{ key: "damaging" }], attackRoll: 27 }));

    expect(r.amount).toBe(base.amount + 6);
    expect(r.steps.map((s) => s.label)).toEqual([...base.steps.map((s) => s.label), dynamicTextRef("wfrpEquipment.qualities.damaging")]);
    expect(r.steps.at(-1)).toMatchObject({ value: 6, side: "attacker" });
  });

  it("Penetrating reduces AP effect", () => {
    const base = mitigateWfrpDamage(ctx({ body: 4 })).amount;

    expect(mitigateWfrpDamage(ctx({ body: 4, qualities: [{ key: "penetrating" }] })).amount).toBe(base + 2);
  });

  it("Undamaging can reduce damage to 0, plain minimum stays 1", () => {
    expect(mitigateWfrpDamage(ctx({ body: 12, netSl: 0 })).amount).toBe(1);

    const r = mitigateWfrpDamage(ctx({ body: 12, netSl: 0, flaws: [{ key: "undamaging" }] }));

    expect(r.amount).toBe(0);
    expect(r.steps.reduce((sum, st) => sum + st.value, 0)).toBe(0);
  });

  it("step order: weapon, sb..., quality, minimum", () => {
    const r = mitigateWfrpDamage(ctx({ body: 12, qualities: [{ key: "precise" }], netSl: 0 }));

    const order = r.steps.map((s) => s.label);

    const at = (key: string) => order.findIndex((l) => JSON.stringify(l) === JSON.stringify(dynamicTextRef(key in QUALITY_REGISTRY ? `wfrpEquipment.qualities.${key}` : `battleWfrp.damage.steps.${key}`)));

    expect(at("precise")).toBeGreaterThan(at("ap"));
    expect(at("minimum")).toBeGreaterThan(at("precise"));
  });
});

describe("resolveWfrpAttack qualities", () => {
  const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

  const fighter = (id: string): BattleParticipant => {
    const p = makeParticipant({ id, hp: 20, maxHp: 20 });

    const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } };

    return { ...p, abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { ap: { head: 0, arm: 0, body: 0, leg: 0 } }) } };
  };

  const run = (attack: BattleAttack, manualRoll = 30) =>
    resolveWfrpAttack({ attacker: fighter("a"), target: fighter("t"), attack, participants: [], rules: WFRP_RULES, rng: () => 0.5, manualRoll, momentum: { attacker: false, defender: false } });

  const q = (qualities: QualityRef[], flaws: QualityRef[] = [], type: BattleAttack["type"] = AttackType.MELEE): BattleAttack => ({ ...sword, type, system: ATTACK_SLOT.write({ qualities, flaws }) });

  it("Accurate +10 and Imprecise -10 shift the target", () => {
    expect(attackOf(run(q([{ key: "accurate" }])).attackRoll)?.target).toBe(50);
    expect(attackOf(run(q([], [{ key: "imprecise" }])).attackRoll)?.target).toBe(30);
    expect(attackOf(run(q([{ key: "accurate" }], [], AttackType.RANGED)).attackRoll)?.target).toBe(50);
  });

  it("Dangerous fumbles on a roll of 91+ even when it would hit", () => {
    const hit = { ...q([]), system: ATTACK_SLOT.write({ qualities: [{ key: "accurate" as const }], flaws: [{ key: "dangerous" as const }] }) };

    expect(run(hit, 44).isHit).toBe(true);
    expect(run(hit, 91).isHit).toBe(false);
  });

  it("Unreliable roll 96+ is a miss", () => {
    expect(run(q([], [{ key: "unreliable" }]), 97).isHit).toBe(false);
  });

  it("no wfrp payload: unchanged", () => {
    expect(attackOf(run(sword).attackRoll)?.target).toBe(40);
  });
});
