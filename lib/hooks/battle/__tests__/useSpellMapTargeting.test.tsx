// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { fakeScene } from "./fake-scene";

import { useBonusSpells, useReactionSpells, useSpellBook } from "@/lib/hooks/battle/useSpellBook";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import type { GridPoint } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

const spells = [
  { id: "ray", name: "Ray", level: 0, cost: "action", dice: 1, dieSides: 6, targeting: { kind: "enemy", range: 60 }, resolution: { kind: "auto" } },
  { id: "cloud", name: "Cloud", level: 0, cost: "action", dice: 1, dieSides: 6, targeting: { kind: "template", shape: "circle", size: 5, range: 60, side: "enemy", maxTargets: 10 }, resolution: { kind: "auto" } },
] as BookSpell[];

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(["ray", "cloud"])("%s map lifecycle uses live caster, clears registrations and Escape on unmount", async id => {
  const fetch = vi.fn(async (_input: RequestInfo | URL) => Response.json(spells));

  vi.stubGlobal("fetch", fetch);

  const { wrapper, value, me, gob, ally } = fakeScene({ isDM: true, knownSpells: ["ray", "cloud"], map: { cols: 10, rows: 10, background: null, opacity: 0.3 } });

  const first = { ...me, battleData: { ...me.battleData, position: { x: 1, y: 1 } } };

  const second = { ...ally, spellcasting: first.spellcasting, battleData: { ...ally.battleData, position: { x: 2, y: 1 } } };

  value.battle = { ...value.battle, initiativeOrder: [first, second, { ...gob, battleData: { ...gob.battleData, position: { x: 3, y: 1 } } }] };

  const add = vi.spyOn(window, "addEventListener");

  const remove = vi.spyOn(window, "removeEventListener");

  let renders = 0;

  const { result, rerender, unmount } = renderHook(({ caster }) => { renders++;

    return useSpellBook(caster);
  }, { wrapper, initialProps: { caster: first } });

  act(() => result.current.actions.open());
  await waitFor(() => expect(result.current.view.spells).toHaveLength(2));

  const selected = spells.find(s => s.id === id);

  if (!selected) throw Error("MISSING_FIXTURE_SPELL");

  act(() => result.current.actions.pick(selected));
  act(() => result.current.actions.toTargets());
  expect(result.current.state.step).toBe("targets");

  const setter = id === "cloud" ? value.intents.setMapAim : value.intents.setMapPick;

  expect(setter).toHaveBeenLastCalledWith(expect.objectContaining({ casterId: "me" }));
  rerender({ caster: second });
  expect(setter).toHaveBeenCalledWith(null);
  expect(setter).toHaveBeenLastCalledWith(expect.objectContaining({ casterId: "ally" }));

  if (id === "ray") {
    const pick = vi.mocked(value.intents.setMapPick).mock.lastCall?.[0] as MapPick;

    act(() => pick.onPick("gob"));
    expect(result.current.state.targetIds).toEqual(["gob"]);
    expect(result.current.state.step).toBe("rolls");
  } else {
    const aim = vi.mocked(value.intents.setMapAim).mock.lastCall?.[0] as MapAim;

    act(() => aim.onHover?.({ x: 3, y: 1 }));

    const hovered = result.current.view.hover.get();

    expect(hovered).toEqual({ x: 3, y: 1 });
    expect(result.current.view.aimPreviewAt(hovered as GridPoint).targets.map(t => t.participant.basicInfo.id)).toContain("gob");
    act(() => aim.onAim({ x: 3, y: 1 }));
    expect(result.current.state.targetIds).toEqual(["gob", "ally"]);
    expect(result.current.state.step).toBe("rolls");
  }

  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0]?.[0])).toContain("ids=cloud,ray");

  const listeners = add.mock.calls.filter(([kind]) => String(kind) === "keydown").map(([, listener]) => listener);

  unmount();
  expect(setter).toHaveBeenLastCalledWith(null);
  for (const listener of listeners) expect(remove).toHaveBeenCalledWith("keydown", listener);
  console.info(JSON.stringify({ scenario: id, requests: fetch.mock.calls.length, renders }));
  add.mockRestore(); remove.mockRestore();
});

it.each([false, true])("library scopes requested IDs to viewer control (DM=%s) and shares bonus/reaction cache", async isDM => {
  const fetch = vi.fn(async (_input: RequestInfo | URL) => Response.json([
    { ...spells[0], cost: "bonusAction" }, { ...spells[1], cost: "reaction" },
  ]));

  vi.stubGlobal("fetch", fetch);

  const { wrapper, value, me, gob, ally } = fakeScene({ isDM, knownSpells: ["ray", "cloud"] });

  value.battle = { ...value.battle, initiativeOrder: [me, { ...gob, spellcasting: { ...gob.spellcasting, knownSpells: ["enemy-secret"] } }, ally] };

  const { result, rerender } = renderHook(() => ({ bonus: useBonusSpells(me), reaction: useReactionSpells(me) }), { wrapper });

  await waitFor(() => expect(result.current.reaction.map(s => s.id)).toEqual(["cloud"]));
  expect(result.current.bonus.map(s => s.id)).toEqual(["ray"]);
  rerender();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0][0])).toContain(isDM ? "ids=cloud,enemy-secret,ray" : "ids=cloud,ray");
});

it("hover на карті не перерендерює хук книги, а бібліотека зберігає референцію", async () => {
  vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL) => Response.json(spells)));

  const { wrapper, value, me, gob } = fakeScene({ isDM: true, knownSpells: ["ray", "cloud"], map: { cols: 10, rows: 10, background: null, opacity: 0.3 } });

  const caster = { ...me, battleData: { ...me.battleData, position: { x: 1, y: 1 } } };

  value.battle = { ...value.battle, initiativeOrder: [caster, { ...gob, battleData: { ...gob.battleData, position: { x: 3, y: 1 } } }] };

  let renders = 0;

  const { result, rerender } = renderHook(() => { renders++;

    return useSpellBook(caster);
  }, { wrapper });

  act(() => result.current.actions.open());
  await waitFor(() => expect(result.current.view.spells).toHaveLength(2));

  const library = result.current.view.spells;

  rerender();
  expect(result.current.view.spells).toBe(library);

  const cloud = spells[1];

  act(() => result.current.actions.pick(cloud));
  act(() => result.current.actions.toTargets());

  const aim = vi.mocked(value.intents.setMapAim).mock.lastCall?.[0] as MapAim;

  const before = renders;

  act(() => { for (let x = 0; x < 10; x++) aim.onHover?.({ x, y: 1 }); });
  expect(renders).toBe(before);
  expect(result.current.view.hover.get()).toEqual({ x: 9, y: 1 });
});
