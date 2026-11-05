// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { fakeScene } from "./fake-scene";

import { useSpellBook } from "@/lib/hooks/battle/useSpellBook";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BookSpell } from "@/types/spells";

const spell = { id: "bolt", name: "Bolt", level: 1, dice: 0, targeting: { kind: "enemy" }, resolution: { kind: "auto" }, ingredients: [{ name: "Diamond", qty: 1, minGp: 50, consumed: true, focus: false }] } as unknown as BookSpell;

vi.mock("@/lib/hooks/spells", () => ({
  useSpells: () => ({ data: [] }),
  useSpellsByIds: () => ({ data: [spell] }),
  usePrefetchSpellsByIds: () => undefined,
}));

function line(system: "wfrp" | "dnd5e") {
  const { wrapper, me, value } = fakeScene({ system, knownSpells: ["bolt"], slots: { "1": { current: 1, max: 1 } } });

  value.battle.rules = { ...(system === "wfrp" ? WFRP_RULES : DEFAULT_RULES), spellIngredients: { enabled: true, autoPay: false } };

  const caster = { ...me, battleData: { ...me.battleData, ingredientStock: { items: [{ id: "i1", key: "diamond", name: "Diamond", worthGp: 50, qty: 1, used: 0 }], purseCp: 0, usedCp: 0 } } };

  const { result } = renderHook(() => useSpellBook(caster), { wrapper });

  act(() => { result.current.actions.open(); result.current.actions.pick(spell); });

  return result.current.view.ingredients;
}

describe("spell book ingredient line", () => {
  it("shows the optional line in a magic system", () => {
    expect(line("wfrp")).toMatchObject({ optional: true, blocked: false });
  });

  it("stays a required line in d20", () => {
    expect(line("dnd5e")).toMatchObject({ optional: false });
  });
});
