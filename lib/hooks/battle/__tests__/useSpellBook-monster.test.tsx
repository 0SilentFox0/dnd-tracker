// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { fakeScene } from "./fake-scene";

import { useSpellBook } from "@/lib/hooks/battle/useSpellBook";
import { textOf } from "@/lib/i18n/test/text";
import type { BookSpell } from "@/types/spells";

const spell = { id: "aura", name: "Аура", level: 0, dice: 1, dieSides: 6, targeting: { kind: "template", shape: "emanation", size: 5, side: "enemy", maxTargets: 10 }, resolution: { kind: "save", ability: "wisdom", onSuccess: "half" } } as BookSpell;

vi.mock("@/lib/hooks/spells", () => ({
  useSpells: () => ({ data: [] }),
  useSpellsByIds: () => ({ data: [spell] }),
  usePrefetchSpellsByIds: () => undefined,
}));

describe("monster spell book", () => {
  it("lists grants without knownSpells, bypasses slots and shows remaining recharge uses", () => {
    const { wrapper, me } = fakeScene({ isDM: true });

    const caster = { ...me, spellcasting: { ...me.spellcasting, knownSpells: [], spellSlots: {}, grants: [{ spellId: spell.id, pool: "pool:spell:aura", cost: 1, castLevel: 3 }] }, battleData: { ...me.battleData, pools: { "pool:spell:aura": { label: "Аура", max: 1, rest: null, recharge: 5 as const } }, abilityUsage: { "pool:spell:aura": { battle: 1, round: 0, turn: 0 } } } };

    const { result } = renderHook(() => useSpellBook(caster), { wrapper });

    act(() => result.current.actions.open());
    expect(result.current.view.spells.map((s) => s.id)).toContain(spell.id);
    expect(result.current.view.noSlot({ ...spell, level: 3 })).toBe(false);

    const label = textOf(result.current.view.slotCostLabel(spell)!);

    expect(label).toContain("0/1");
    expect(label).toContain("5–6");
    expect(result.current.view.costUsed(spell)).toBe(true);
    act(() => result.current.actions.pick({ ...spell, level: 3 }));
    expect(result.current.state.slotKey).toBeUndefined();
  });

  it("at-will grants show their limit and legendary-only grants are blocked in normal casting", () => {
    const { wrapper, me } = fakeScene({ isDM: true });

    const caster = { ...me, spellcasting: { ...me.spellcasting, knownSpells: [spell.id], grants: [{ spellId: spell.id, legendaryOnly: true as const }] } };

    const { result } = renderHook(() => useSpellBook(caster), { wrapper });

    expect(textOf(result.current.view.slotCostLabel(spell)!)).toContain("Лише легендарна");
    expect(result.current.view.costUsed(spell)).toBe(true);
  });
  it("shows live emanation targets and saves without aiming, and submits no targetCell", async () => {
    const { wrapper, value, me, gob } = fakeScene({ isDM: true, knownSpells: ["aura"], map: { cols: 10, rows: 10, background: null, opacity: 0.3 } });

    const caster = { ...me, battleData: { ...me.battleData, position: { x: 3, y: 3 } } };

    const near = { ...gob, battleData: { ...gob.battleData, position: { x: 4, y: 4 } } };

    value.battle = { ...value.battle, initiativeOrder: [caster, near] };

    const { result, rerender } = renderHook(() => useSpellBook(caster), { wrapper });

    act(() => { result.current.actions.open(); result.current.actions.pick(spell); });
    act(() => result.current.actions.toTargets());

    expect(result.current.state.step).toBe("rolls");
    expect(result.current.state.targetIds).toEqual(["gob"]);
    expect(result.current.view.saveTargets.map(p => p.basicInfo.id)).toEqual(["gob"]);
    expect(value.intents.setMapAim).not.toHaveBeenCalled();

    value.battle = { ...value.battle, initiativeOrder: [caster, { ...near, battleData: { ...near.battleData, position: { x: 8, y: 8 } } }] };
    rerender();
    expect(result.current.state.targetIds).toEqual([]);

    act(() => result.current.actions.setDamage(0, 4));
    act(() => result.current.actions.toSummary());
    await act(async () => result.current.actions.submit());
    expect(value.actions.castSpell.mutateAsync).toHaveBeenCalledWith(expect.not.objectContaining({ targetCell: expect.anything() }));
  });
});

describe("legendary spell book", () => {
  it("opens a linked spell with no slot or action cost and sends legendaryKey", async () => {
    const { wrapper, value, me } = fakeScene({ isDM: true });

    const caster = { ...me, actionFlags: { ...me.actionFlags, hasUsedAction: true }, spellcasting: { ...me.spellcasting, knownSpells: [], spellSlots: {}, grants: [{ spellId: spell.id, legendaryOnly: true as const, castLevel: 3 }] } };

    const { result } = renderHook(() => useSpellBook(caster, { legendary: { abilityKey: "legend:ray", spellId: spell.id } }), { wrapper });

    act(() => result.current.actions.open());
    expect(result.current.state.step).toBe("spell");
    expect(result.current.view.selected?.id).toBe(spell.id);
    expect(result.current.view.costUsed(spell)).toBe(false);
    expect(result.current.view.slot.options).toEqual([]);
    act(() => result.current.actions.toTargets());
    act(() => result.current.actions.setDamage(0, 4));
    act(() => result.current.actions.toSummary());
    await act(async () => result.current.actions.submit());
    expect(value.actions.castSpell.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ legendaryKey: "legend:ray", spellId: spell.id }));
  });
});
