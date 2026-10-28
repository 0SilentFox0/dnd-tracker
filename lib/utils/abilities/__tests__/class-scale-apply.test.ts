import { describe, expect, it } from "vitest";

import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";
import { resolveLimitFormulas } from "@/lib/utils/abilities/build/limit-formulas";
import { applyClassScale, classPools, poolKey } from "@/lib/utils/abilities/class-columns";
import type { Ability } from "@/lib/utils/abilities/schema";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { ClassColumn, GameClassData, ResolvedClassEntry } from "@/types/classes";

const levels = (f: (l: number) => string) => Array.from({ length: 20 }, (_, i) => f(i + 1));

const barbCols: ClassColumn[] = [
  { key: "rages", label: "Rages", values: levels((l) => (l >= 17 ? "6" : l >= 9 ? "4" : "2")) },
  { key: "rage-damage", label: "Rage Damage", values: levels((l) => (l >= 16 ? "+4" : l >= 9 ? "+3" : "+2")) },
  { key: "dice-col", label: "Dice", values: levels(() => "1d6") },
];

const rage: Ability = {
  id: "rage",
  name: "Rage",
  trigger: { event: "bonusAction" },
  limits: { perRest: { rest: "long", uses: { scale: "rages" } } },
  effects: [
    { kind: "damageBonus", filter: { kind: "melee" }, flat: { scale: "rage-damage" }, duration: { rounds: 10 } },
    { kind: "heal", amount: { formula: "2 * class_level" }, target: "self" },
  ],
};

const ctx = (level: number) => ({ classId: "barb", level, columns: barbCols });

describe("applyClassScale", () => {
  it("numbers and class_level by the level in this class", () => {
    const [at9] = applyClassScale([rage], ctx(9));

    expect(at9.limits?.perRest?.uses).toBe(4);
    expect(at9.effects[0]).toMatchObject({ flat: 3 });
    expect(at9.effects[1]).toMatchObject({ amount: { formula: "2 * 9" } });
    expect(applyClassScale([rage], ctx(1))[0].limits?.perRest?.uses).toBe(2);
    expect(applyClassScale([rage], ctx(17))[0].limits?.perRest?.uses).toBe(6);
  });

  it("dice stay dice in amounts, become 0 in numeric fields; missing column → 0", () => {
    const a: Ability = {
      id: "x",
      name: "X",
      trigger: { event: "hit", role: "attacker" },
      effects: [
        { kind: "dealDamage", amount: { scale: "dice-col" }, target: "eventTarget" },
        { kind: "modifyStat", stat: "armor", flat: { scale: "dice-col" }, duration: { rounds: 1 } },
        { kind: "dealDamage", amount: { scale: "nope" }, target: "eventTarget" },
      ],
    };

    const [out] = applyClassScale([a], ctx(5));

    expect(out.effects.map((e) => ("amount" in e ? e.amount : "flat" in e ? e.flat : null))).toEqual(["1d6", 0, 0]);
  });

  it("empty cell at the level and level above 20", () => {
    const focus: ClassColumn = { key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } };

    const a: Ability = { id: "w", name: "W", trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: { scale: "focus-points" } } }, effects: [{ kind: "note", text: "n" }] };

    expect(applyClassScale([a], { classId: "monk", level: 1, columns: [focus] })[0].limits?.perRest?.uses).toBe(0);
    expect(applyClassScale([a], { classId: "monk", level: 30, columns: [focus] })[0].limits?.perRest?.uses).toBe(20);
  });

  it("renames the pool key per class; untouched abilities keep identity", () => {
    const pd: Ability = { id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: "focus-points", cost: 1 } }, effects: [{ kind: "note", text: "n" }] };

    const plain: Ability = { id: "p", name: "P", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 10 }] };

    const [renamed, same] = applyClassScale([pd, plain], { classId: "monk", level: 5, columns: [] });

    expect(renamed.limits?.pool).toEqual({ key: poolKey("monk", "focus-points"), cost: 1 });
    expect(poolKey("monk", "focus-points")).toBe("pool:monk:focus-points");
    expect(same).toBe(plain);
  });
});

const cls = (id: string, over: Partial<GameClassData>): GameClassData => ({
  id, name: id, icon: null, color: null, hitDie: 8, savingThrows: [], proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [], ...over,
});

const focusCol: ClassColumn = { key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } };

const cdCol = (key: string): ClassColumn => ({ key, label: "Channel Divinity", values: levels(() => "2"), pool: { rest: "short" } });

describe("multiclass and subclass", () => {
  const second: Ability = { id: "sw", name: "Second Wind", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: { formula: "class_level" }, target: "self" }] };

  const wholeness: Ability = { id: "wb", name: "Wholeness", trigger: { event: "bonusAction" }, limits: { pool: { key: "focus-points", cost: 1 } }, effects: [{ kind: "heal", amount: { formula: "class_level" }, target: "self" }] };

  const fighter = cls("fighter", { features: [{ level: 1, abilities: [second] }] });

  const monk = cls("monk", { columns: [focusCol], subclasses: [{ id: "oh", name: "Open Hand", features: [{ level: 3, abilities: [wholeness] }] }] });

  const entries: ResolvedClassEntry[] = [
    { classId: "fighter", level: 3, class: fighter, subclass: null },
    { classId: "monk", level: 5, subclassId: "oh", class: monk, subclass: monk.subclasses[0] },
  ];

  it("each class uses its own level; the subclass uses its class columns and pool", () => {
    const list = collectCharacterAbilities({ skills: [], race: null, artifacts: [], completedSets: [], classes: entries });

    expect(list.find((a) => a.id === "sw")?.effects[0]).toMatchObject({ amount: { formula: "3" } });
    expect(list.find((a) => a.id === "wb")).toMatchObject({ effects: [{ amount: { formula: "5" } }], limits: { pool: { key: "pool:monk:focus-points" } } });
  });

  it("classPools: max at the class level, separate keys per class, empty cells skipped", () => {
    const cleric = cls("cleric", { columns: [cdCol("channel-divinity-uses")] });

    const paladin = cls("paladin", { columns: [cdCol("channel-divinity-uses")] });

    expect(classPools([...entries, { classId: "cleric", level: 2, class: cleric, subclass: null }, { classId: "paladin", level: 3, class: paladin, subclass: null }])).toEqual({
      "pool:monk:focus-points": { label: "Focus Points", max: 5, rest: "short" },
      "pool:cleric:channel-divinity-uses": { label: "Channel Divinity", max: 2, rest: "short" },
      "pool:paladin:channel-divinity-uses": { label: "Channel Divinity", max: 2, rest: "short" },
    });
    expect(classPools([{ classId: "monk", level: 1, class: monk, subclass: null }])).toEqual({});
  });
});

describe("resolveLimitFormulas", () => {
  const withAbility = (uses: number | { formula: string }, cha: number) => {
    const p = createMockParticipant();

    return {
      ...p,
      abilities: { ...p.abilities, modifiers: { ...p.abilities.modifiers, charisma: cha } },
      battleData: { ...p.battleData, resolvedAbilities: [{ id: "bi", name: "Bardic Inspiration", trigger: { event: "bonusAction" as const }, limits: { perRest: { rest: "long" as const, uses } }, effects: [{ kind: "note" as const, text: "n" }], source: { type: "class" as const, id: "bard", name: "Bard" }, key: "class:bard:bi" }] },
    };
  };

  it("formula uses → number with a floor of 1; numeric uses keep the participant", () => {
    expect(resolveLimitFormulas(withAbility({ formula: "max(1, cha_mod)" }, 3)).battleData.resolvedAbilities[0].limits?.perRest?.uses).toBe(3);
    expect(resolveLimitFormulas(withAbility({ formula: "cha_mod" }, -2)).battleData.resolvedAbilities[0].limits?.perRest?.uses).toBe(1);

    const plain = withAbility(2, 3);

    expect(resolveLimitFormulas(plain)).toBe(plain);
  });
});
