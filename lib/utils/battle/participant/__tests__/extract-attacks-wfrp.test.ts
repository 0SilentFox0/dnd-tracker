import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { extractAttacksFromCharacter } from "../extract-attacks";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { attackReachError } from "@/lib/utils/battle/grid/attack-reach";
import type { CharacterFromPrisma } from "@/lib/utils/battle/types/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { extractWfrpAttacks } from "@/systems/wfrp/rules/combat/extract-attacks";
import { mitigateWfrpDamage } from "@/systems/wfrp/rules/combat/mitigate";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { armourAp } from "@/systems/wfrp/rules/equipment/armour";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleAttack, BattleMapConfig } from "@/types/battle";

const weaponStats = (over: object) => ({ type: "weapon", group: "basic", reach: "average", damage: { addSb: true, flat: 4 }, qualities: [], flaws: [], twoHanded: false, weight: 1, price: 1, ...over });

const row = (id: string, slot: string, systemStats: unknown, carried?: true) => ({ row: { id, name: id, slot, systemStats } as unknown as Prisma.ArtifactGetPayload<object>, slot, ...(carried && { carried }) });

const hero = { campaignId: "c", inventory: null } as unknown as CharacterFromPrisma;

const extract = (rows: ReturnType<typeof row>[]) => extractAttacksFromCharacter(hero, {}, undefined, { attacksOf: () => extractWfrpAttacks({ rows }) });

const sword = row("sword", "weapon", weaponStats({}));

const bow = row("bow", "range_weapon", weaponStats({ reach: undefined, range: 60, group: "bow", damage: { addSb: false, flat: 3 }, twoHanded: true, ammoCapacity: 20, flaws: [{ key: "reload", value: 1 }] }));

describe("extractWfrpAttacks", () => {
  it("sword becomes a melee attack with flat damage and reach", () => {
    const [a, d] = extract([sword]);

    expect(a).toMatchObject({ id: "sword", type: AttackType.MELEE, damageDice: "", damageBonus: 4, attackBonus: 0, reachCells: 1, system: { key: "wfrp", data: { qualities: [], flaws: [] } } });
    expect(a.range).toBeUndefined();
    expect(d.id).toBe("default-ranged");
  });

  it("bow becomes a ranged attack with range, ammo and reload", () => {
    const [a] = extract([bow]);

    expect(a).toMatchObject({ id: "bow", type: AttackType.RANGED, range: "60 ft", damageDice: "", damageBonus: 3, ammo: { capacity: 20, reload: 1 }, system: { key: "wfrp", data: { noSb: true } } });
  });

  it("the same artifact in two slots gets independent attack ids", () => {
    const ids = extract([row("bow", "range_weapon", bow.row.systemStats), row("bow", "weapon", bow.row.systemStats)]).map((a) => a.id).filter((id) => id?.startsWith("bow"));

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toBe("bow");
  });

  it("both weapons: two attacks, no defaults", () => {
    expect(extract([sword, bow]).map((a) => a.id)).toEqual(["sword", "bow"]);
  });

  it("garbage stats, carried and non-weapon slots fall back to defaults", () => {
    const attacks = extract([row("x", "weapon", { junk: 1 }), row("carried", "weapon", weaponStats({}), true), row("armour", "armor", weaponStats({}))]);

    expect(attacks.map((a) => a.id)).toEqual(["default-melee", "default-ranged"]);
  });

  it("a weapon in the shield slot gets its own attack; a shield gives none", () => {
    const dagger = weaponStats({ damage: { addSb: true, flat: 2 }, ammoCapacity: 3 });

    const attacks = extract([sword, row("dagger", "shield", dagger), row("buckler", "shield", { type: "gear", weight: 1, price: 1, qualities: [{ key: "shield", value: 1 }], flaws: [] })]);

    expect(attacks.map((a) => a.id).slice(0, 2)).toEqual(["sword", "dagger"]);
    expect(attacks.some((a) => a.id === "buckler")).toBe(false);
    expect(attacks[1]).toMatchObject({ damageBonus: 2, ammo: { capacity: 3 } });
  });

  it("the same weapon in main hand and shield slot gets independent ids", () => {
    expect(extract([row("knife", "weapon", weaponStats({})), row("knife", "shield", weaponStats({}))]).map((a) => a.id).slice(0, 2)).toEqual(["knife", "knife:shield"]);
  });

  it("Blast X becomes an aoe attack", () => {
    const [a] = extract([row("bomb", "range_weapon", weaponStats({ reach: undefined, range: 30, qualities: [{ key: "blast", value: 2 }] }))]);

    expect(a).toMatchObject({ targetType: "aoe", blastRadius: 2 });
  });

  it("without equipment opts the d20 path is used", () => {
    expect(extractAttacksFromCharacter(hero, {}).map((a) => a.id)).toEqual(["default-melee", "default-ranged"]);
  });
});

describe("wfrp weapon attacks in play", () => {
  const map: BattleMapConfig = { cols: 30, rows: 10, background: null, opacity: 0.3 };

  const at = (id: string, x: number, side: ParticipantSide) => {
    const p = createMockParticipant();

    return { ...p, basicInfo: { ...p.basicInfo, id, side }, battleData: { ...p.battleData, position: { x, y: 5 } } };
  };

  const shooter = at("h", 5, ParticipantSide.ALLY);

  const adjacent = at("e1", 6, ParticipantSide.ENEMY);

  const target = at("e2", 12, ParticipantSide.ENEMY);

  const attack = (ignoresEngagement: boolean) => ({ id: "g", name: "Gun", type: AttackType.RANGED, range: "60 ft", ...(ignoresEngagement && { ignoresEngagement: true }) }) as unknown as BattleAttack;

  it("Pistol shoots an engaged enemy, a plain bow is refused", () => {
    expect(attackReachError(map, [shooter, adjacent, target], shooter, attack(true), [target], DEFAULT_RULES)).toBeNull();
    expect(attackReachError(map, [shooter, adjacent, target], shooter, attack(false), [target], DEFAULT_RULES)).not.toBeNull();
  });

  it("addSb:false weapon has no sb step", () => {
    const strong = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, s: 50 } };

    const attacker = { ...makeParticipant({ id: "a", hp: 10, maxHp: 10 }) };

    attacker.abilities = { ...attacker.abilities, ...wfrpAbilitiesOf(strong) };

    const ctx = { attacker, target: makeParticipant({ id: "t", hp: 10, maxHp: 10 }), weapon: 3, amount: 5, margin: 1, location: "body" as const, crit: false, rng: () => 0.5, rules: WFRP_RULES, attack: { id: "w", name: "w", type: AttackType.MELEE, attackBonus: 0, damageDice: "", damageType: "physical" } as BattleAttack };

    const sbLabel = dynamicTextRef("battleWfrp.damage.steps.sb");

    const has = (r: ReturnType<typeof mitigateWfrpDamage>) => r.steps.some((s) => JSON.stringify(s.label) === JSON.stringify(sbLabel));

    expect(has(mitigateWfrpDamage(ctx))).toBe(true);
    expect(has(mitigateWfrpDamage({ ...ctx, attack: { ...ctx.attack, system: { key: "wfrp", data: { qualities: [], flaws: [], noSb: true } } } }))).toBe(false);
  });
});

describe("armourAp with two-handed weapons", () => {
  const shield = { slot: "shield", systemStats: { type: "gear", weight: 1, price: 1, qualities: [{ key: "shield", value: 2 }] } };

  it("one-handed weapon keeps the shield", () => {
    expect(armourAp([shield, { slot: "weapon", systemStats: weaponStats({}) }]).ap.body).toBe(2);
  });

  it("two-handed weapon drops the shield bonus", () => {
    expect(armourAp([shield, { slot: "weapon", systemStats: weaponStats({ twoHanded: true }) }]).ap.body).toBe(0);
  });
});
