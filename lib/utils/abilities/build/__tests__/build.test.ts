import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyBakedAuras, bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";

describe("bake", () => {
  it("запікає maxHp, ініціативу, Силу (з модифікатором) і слоти", () => {
    const ab = resolved({
      trigger: { event: "passive" },
      effects: [
        { kind: "modifyStat", stat: "maxHp", flat: 5 },
        { kind: "modifyStat", stat: "initiative", flat: 2 },
        { kind: "modifyStat", stat: "strength", flat: 2 },
        { kind: "modifyStat", stat: "spellSlots", spellLevels: [4, 5], flat: 1 },
      ],
    });

    const p = bakePassives(makeParticipant({ id: "a", abilities: [ab] }));

    expect(p.combatStats).toMatchObject({ maxHp: 25, currentHp: 25 });
    expect(p.abilities.baseInitiative).toBe(12);
    expect(p.abilities.strength).toBe(16);
    expect(p.abilities.modifiers.strength).toBe(3);
    expect(p.spellcasting.spellSlots["4"]).toEqual({ max: 1, current: 1 });
  });

  it("аури: allAllies включає джерело; повторний виклик для нових не дублює старих", () => {
    const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxHp", flat: 3, target: "allAllies" }] });

    const ps = [makeParticipant({ id: "s", abilities: [aura] }), makeParticipant({ id: "x" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    const once = applyBakedAuras(ps, new Set(["s", "x", "e"]));

    expect(once.map((p) => p.combatStats.maxHp)).toEqual([23, 23, 20]);

    const withNew = applyBakedAuras([...once, makeParticipant({ id: "n" })], new Set(["n"]));

    expect(withNew.map((p) => p.combatStats.maxHp)).toEqual([23, 23, 20, 23]);
  });

  it("однакова аура від кількох власників запікається один раз (найсильніша)", () => {
    const fear = (flat: number) => resolved({ id: "unit-fear-aura", name: "Аура страху", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "morale", flat, target: "allEnemies" }] });

    const enemies = [1, 2, 3].map((i) => makeParticipant({ id: `m${i}`, side: ParticipantSide.ENEMY, abilities: [fear(i === 3 ? -2 : -1)] }));

    const hero = makeParticipant({ id: "h" });

    const baked = applyBakedAuras([hero, ...enemies], new Set(["h", "m1", "m2", "m3"]));

    expect(baked[0].combatStats.morale).toBe(-2);

    const another = makeParticipant({ id: "m4", side: ParticipantSide.ENEMY, abilities: [fear(-1)] });

    expect(applyBakedAuras([...baked, another], new Set(["m4"]))[0].combatStats.morale).toBe(-2);
  });
});

describe("collectCharacterAbilities", () => {
  it("найвищий у лінії, школа з mainSkill, сет лише повний", () => {
    const skillRow = (id: string, name: string, pct: number) => ({
      id,
      name,
      icon: null,
      spellGroupId: null,
      abilities: [{ id: "t0", name, trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "magic" }, percent: pct }] }],
    });

    const list = collectCharacterAbilities({
      skills: [
        { row: skillRow("b", "Хаос — Базовий", 10), level: "basic", levelNode: true, mainSkillId: "m", mainSkillSpellGroupId: "chaos" },
        { row: skillRow("e", "Хаос — Експерт", 30), level: "expert", levelNode: true, mainSkillId: "m", mainSkillSpellGroupId: "chaos" },
      ],
      race: null,
      artifacts: [],
      completedSets: [],
    });

    expect(list).toHaveLength(1);
    expect(list[0].effects[0]).toEqual({ kind: "damageBonus", filter: { kind: "magic", school: "chaos" }, percent: 30 });
  });
});
