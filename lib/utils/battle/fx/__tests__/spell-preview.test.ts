import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { previewSpellFx } from "@/lib/utils/battle/fx/spell-preview";

const preview = (name: string) => {
  const spell = SPELLS.find((s) => s.name === name);

  if (!spell) throw new Error(`no library spell ${name}`);

  return previewSpellFx(spell);
};

describe("previewSpellFx", () => {
  it("casts every library spell without errors", () => {
    const failed = SPELLS.map(previewSpellFx).filter((p) => p.error || !p.spec);

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

  it("plague is a poison bolt that leaves the plague aura without a hit frame", () => {
    const p = preview("Чума");

    expect(p.spec).toMatchObject({ archetype: "bolt", element: "poison" });
    expect(p.targets).toEqual([{ id: "e1", frame: null, auras: ["plague"] }]);
  });

  it("deep freeze is a cold bolt that freezes the target", () => {
    const p = preview("Глибока заморозка");

    expect(p.spec).toMatchObject({ archetype: "bolt", element: "cold" });
    expect(p.frames).toEqual(["cold"]);
    expect(p.auras).toEqual(["frozen"]);
  });

  it("roots entangle the target with nature and the roots aura", () => {
    const p = preview("Корені");

    expect(p.spec).toMatchObject({ archetype: "entangle", element: "nature" });
    expect(p.auras).toEqual(["roots"]);
    expect(p.effects).toContain("стан: без ближніх атак");
  });

  it("avatar is a necrotic summon on the caster", () => {
    const p = preview("Аватар");

    expect(p.spec).toMatchObject({ archetype: "summon", element: "necrotic", targetIds: ["caster"] });
    expect(p.targets).toEqual([]);
    expect(p.effects).toEqual(["призов"]);
  });

  it("resurrection heals the fallen ally with the heal frame", () => {
    const p = preview("Воскресіння");

    expect(p.spec).toMatchObject({ archetype: "heal" });
    expect(p.targets).toEqual([{ id: "fallen", frame: "heal", auras: [] }]);
    expect(p.targeting).toBe("полеглий союзник");
  });
});
