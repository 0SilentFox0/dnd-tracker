import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { ukT } from "@/lib/utils/abilities/__tests__/describe-fixtures";
import { linesText } from "@/lib/utils/abilities/segments";
import { castableOf, previewCastFx, previewSpellFx } from "@/lib/utils/battle/fx/spell-preview";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import { spellRules, toBookSpell } from "@/lib/utils/spells/to-book-spell";
import { SPELL_FX_BY_NAME } from "@/scripts/constructor/backfill/spell-fx-by-name";

const preview = (name: string) => {
  const spell = SPELLS.find((s) => s.name === name);

  if (!spell) throw new Error(`no library spell ${name}`);

  return previewSpellFx(spell, SPELL_FX_BY_NAME[name]);
};

describe("previewSpellFx", () => {
  it("casts every library spell without errors", () => {
    const failed = SPELLS.map((s) => previewSpellFx(s, SPELL_FX_BY_NAME[s.name])).filter((p) => p.error || !p.spec);

    expect(failed.map((p) => `${p.name}: ${p.error}`)).toEqual([]);
  });

  it("fireball hits both enemies with a fire area and fire frames", () => {
    const p = preview("Вогняна куля");

    expect(p.spec).toMatchObject({ archetype: "area", element: "fire", actorId: "caster", targetIds: ["e1", "e2"] });
    expect(p.targets).toEqual([
      { id: "e1", frame: "fire", auras: [] },
      { id: "e2", frame: "fire", auras: [] },
    ]);
  });

  it("plague is a fly swarm that leaves the plague aura without a hit frame", () => {
    const p = preview("Чума");

    expect(p.spec).toMatchObject({ archetype: "pestilence", element: "poison" });
    expect(p.targets).toEqual([{ id: "e1", frame: null, auras: ["plague"] }]);
  });

  it("deep freeze is a cold bolt that freezes the target", () => {
    const p = preview("Глибока заморозка");

    expect(p.spec).toMatchObject({ archetype: "bolt", element: "cold" });
    expect(p.frames).toEqual(["cold"]);
    expect(p.auras).toEqual(["frozen"]);
  });

  it("roots entangle the target with nature and the roots aura", async () => {
    const p = preview("Корені");

    expect(p.spec).toMatchObject({ archetype: "entangle", element: "nature" });
    expect(p.auras).toEqual(["roots"]);
    expect(linesText(await ukT(), p.effects)).toContain("без ближніх атак × 1 р.");
  });

  it("avatar is its own necrotic summon on the caster", async () => {
    const p = preview("Аватар");

    expect(p.spec).toMatchObject({ archetype: "avatar", element: "necrotic", targetIds: ["caster"] });
    expect(p.targets).toEqual([]);
    expect(linesText(await ukT(), p.effects)).toEqual(["прикликати 1× обраного юніта"]);
  });

  it("resurrection heals the fallen ally with the heal frame", () => {
    const p = preview("Воскресіння");

    expect(p.spec).toMatchObject({ archetype: "resurrect" });
    expect(p.targets).toEqual([{ id: "fallen", frame: "heal", auras: [] }]);
    expect(p.targeting).toBe("полеглий союзник");
  });
});

describe("previewCastFx for campaign spells", () => {
  const dbRow = {
    id: "db-1",
    name: "Полум'яна хвиля",
    level: 2,
    description: null,
    icon: null,
    spellGroup: { id: "g-fire", name: "Руйнування" },
    dice: 2,
    cost: "action",
    targeting: { kind: "area", side: "enemy", maxTargets: 2 },
    resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
    spellEffects: [
      { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" },
      { kind: "dot", damagePerRound: { spellRoll: 100 }, damageType: "fire", duration: { rounds: 2 } },
    ],
    stackable: false,
    maxStacks: null,
  };

  it("a book spell (GET /spells?ids=) previews like the engine casts it", () => {
    const book = toBookSpell(dbRow);

    const p = previewCastFx(castableOf({ id: book.id, name: book.name, level: book.level, groupId: book.spellGroup?.id ?? null, rules: book }));

    expect(p.error).toBeUndefined();
    expect(p.spec).toMatchObject({ archetype: "area", element: "fire", targetIds: ["e1", "e2"] });
    expect(p.targetIds).toEqual(["e1", "e2"]);
    expect(p.frames).toEqual(["fire"]);
    expect(p.auras).toEqual(["burning"]);
  });

  it("the reference rules give the same preview as the book", () => {
    const rules = spellRules(readSpellDefinition(dbRow));

    const fromReference = previewCastFx(castableOf({ id: dbRow.id, name: dbRow.name, level: dbRow.level, groupId: null, rules }));

    const book = toBookSpell(dbRow);

    const fromBook = previewCastFx(castableOf({ id: book.id, name: book.name, level: book.level, groupId: null, rules: book }));

    // spec.key and spec.actionId carry the cast timestamp
    const stable = (p: typeof fromBook) => ({ ...p, spec: p.spec && { ...p.spec, key: "", actionId: "" } });

    expect(stable(fromReference)).toEqual(stable(fromBook));
  });

  it("raw DB columns (DM library path) and broken rules do not throw", () => {
    const raw = previewCastFx(castableOf({ id: "x", name: "X", level: 1, groupId: null, rules: { targeting: { kind: "self" }, spellEffects: [{ kind: "teleport" }] } as never }));

    expect(raw.targetIds).toEqual(["caster"]);
    expect(() => previewCastFx(castableOf({ id: "y", name: "Y", level: 1, groupId: null, rules: {} }))).not.toThrow();
  });

  it("library spells keep the preview arena targets: self, fallen ally, both enemies", () => {
    expect(preview("Аватар").targetIds).toEqual(["caster"]);
    expect(preview("Воскресіння").targetIds).toEqual(["fallen"]);
    expect(preview("Вогняна куля").targetIds).toEqual(["e1", "e2"]);
  });
});
