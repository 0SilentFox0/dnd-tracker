// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NO_PLAYABLE_NOTICE, useBattleMapEditor } from "../useBattleMapEditor";

import { DEFAULT_BATTLE_MAP } from "@/lib/constants/battle";

describe("useBattleMapEditor", () => {
  it("вимкнено → value null; увімкнено → дефолт", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    expect(result.current.state.value).toBeNull();
    act(() => result.current.actions.setEnabled(true));
    expect(result.current.state.value).toEqual(DEFAULT_BATTLE_MAP);
  });

  it("штрих працює тільки з активним інструментом", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    act(() => result.current.actions.onStroke([{ x: 1, y: 1 }]));
    expect(result.current.state.map.blocked).toBeUndefined();

    act(() => result.current.actions.setTool("blocked"));
    act(() => result.current.actions.onStroke([{ x: 1, y: 1 }, { x: 2, y: 1 }]));
    expect(result.current.state.map.blocked).toEqual(["1:1", "2:1"]);
  });

  it("небезпека без підпису не пише label", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    act(() => result.current.actions.setTool("hazard"));
    act(() => result.current.actions.onStroke([{ x: 4, y: 3 }]));
    expect(result.current.state.map.terrain?.["4:3"]).toEqual({ kind: "hazard", damage: { dice: "1d6", type: "fire" } });
  });

  it("палітра: непрохідне, небезпека з підписом, стерти", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    act(() => result.current.actions.setTool("wall"));
    act(() => result.current.actions.onStroke([{ x: 3, y: 3 }]));
    expect(result.current.state.map.terrain).toEqual({ "3:3": { kind: "wall" } });

    act(() => result.current.actions.setBrush({ label: "Вогняна стіна" }));
    act(() => result.current.actions.setTool("hazard"));
    act(() => result.current.actions.onStroke([{ x: 4, y: 3 }]));
    expect(result.current.state.map.terrain?.["4:3"]).toEqual({ kind: "hazard", label: "Вогняна стіна", damage: { dice: "1d6", type: "fire" } });

    act(() => result.current.actions.setBrush({ dice: "2d4+1", damageType: "acid" }));
    expect(result.current.brush).toEqual({ label: "Вогняна стіна", dice: "2d4+1", damageType: "acid" });
    act(() => result.current.actions.onStroke([{ x: 5, y: 3 }]));
    expect(result.current.state.map.terrain?.["5:3"]?.damage).toEqual({ dice: "2d4+1", type: "acid" });

    act(() => result.current.actions.setTool("erase"));
    act(() => result.current.actions.onStroke([{ x: 5, y: 3 }]));

    act(() => result.current.actions.setTool("erase"));
    act(() => result.current.actions.onStroke([{ x: 3, y: 3 }, { x: 4, y: 3 }]));
    expect(result.current.state.map.terrain).toBeUndefined();
  });

  it("непрохідні клітинки рахуються в правилі 2×2", () => {
    const { result } = renderHook(() => useBattleMapEditor({ cols: 4, rows: 4, background: null, opacity: 1 }));

    act(() => result.current.actions.setTool("wall"));
    act(() => result.current.actions.onStroke([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 1 }]));
    expect(result.current.state.notice).toBe(NO_PLAYABLE_NOTICE);
    expect(result.current.state.map.terrain).toBeUndefined();
  });

  it("збережена карта відкривається з полями, фон не змінюється", () => {
    const initial = { cols: 6, rows: 6, background: "https://x.supabase.co/a.webp", opacity: 0.5 };

    const { result } = renderHook(() => useBattleMapEditor(initial));

    act(() => result.current.actions.setMargins({ top: 1, right: 1, bottom: 1, left: 1 }));
    expect(result.current.state.map.blocked).toHaveLength(20);
    expect(result.current.state.value?.background).toBe(initial.background);
    expect(result.current.state.margins.top).toBe(1);
  });

  it("зміна розміру зберігає поля й відкидає зайве", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    act(() => result.current.actions.setMargins({ top: 1, right: 1, bottom: 1, left: 1 }));
    act(() => result.current.actions.setSize(10, 10));
    expect(result.current.state.map.blocked).toHaveLength(100 - 64);
  });

  it("зменшення розміру перетискає поля", () => {
    const { result } = renderHook(() => useBattleMapEditor({ cols: 12, rows: 12, background: null, opacity: 1 }));

    act(() => result.current.actions.setMargins({ top: 8, right: 0, bottom: 0, left: 0 }));
    act(() => result.current.actions.setSize(12, 4));
    expect(result.current.state.margins.top).toBe(2);
    expect(result.current.state.map.rows).toBe(4);
  });

  it("малювання не залишає менше 2×2 вільних клітинок", () => {
    const { result } = renderHook(() => useBattleMapEditor({ cols: 4, rows: 4, background: null, opacity: 1, blocked: ["0:0", "1:0", "2:0", "3:0", "0:1", "1:1", "2:1", "3:1", "2:2"] }));

    act(() => result.current.actions.setTool("blocked"));
    act(() => result.current.actions.onStroke([{ x: 1, y: 2 }]));
    expect(result.current.state.map.blocked).toHaveLength(9);
    expect(result.current.state.notice).toBe(NO_PLAYABLE_NOTICE);
    act(() => result.current.actions.setTool("erase"));
    act(() => result.current.actions.onStroke([{ x: 2, y: 2 }]));
    expect(result.current.state.map.blocked).toHaveLength(8);
    expect(result.current.state.notice).toBeNull();
  });

  it("setSize/setMargins без вільної 2×2 показують повідомлення", () => {
    const { result } = renderHook(() => useBattleMapEditor({ cols: 4, rows: 4, background: null, opacity: 1 }));

    act(() => result.current.actions.setMargins({ top: 2, right: 0, bottom: 2, left: 0 }));
    expect(result.current.state.notice).toBeTruthy();
    expect(result.current.state.margins.top).toBe(0);
    act(() => result.current.actions.setMargins({ top: 1, right: 0, bottom: 0, left: 0 }));
    expect(result.current.state.notice).toBeNull();
  });

  it("setSize відхиляє розмір без вільної 2×2 і лишає карту", () => {
    const blocked = ["1:0", "1:1", "3:0", "3:1"];

    const { result } = renderHook(() => useBattleMapEditor({ cols: 4, rows: 4, background: null, opacity: 1, blocked }));

    act(() => result.current.actions.setSize(4, 2));
    expect(result.current.state.notice).toBe(NO_PLAYABLE_NOTICE);
    expect(result.current.state.map.rows).toBe(4);
  });

  it("notice зникає, коли вимикають інструмент або карту", () => {
    const { result } = renderHook(() => useBattleMapEditor({ cols: 4, rows: 4, background: null, opacity: 1 }));

    act(() => result.current.actions.setMargins({ top: 2, right: 0, bottom: 2, left: 0 }));
    expect(result.current.state.notice).toBeTruthy();
    act(() => result.current.actions.setTool(null));
    expect(result.current.state.notice).toBeNull();

    act(() => result.current.actions.setMargins({ top: 2, right: 0, bottom: 2, left: 0 }));
    expect(result.current.state.notice).toBeTruthy();
    act(() => result.current.actions.setEnabled(false));
    expect(result.current.state.notice).toBeNull();
  });
});
