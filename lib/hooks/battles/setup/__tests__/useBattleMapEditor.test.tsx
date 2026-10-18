// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useBattleMapEditor } from "../useBattleMapEditor";

import { DEFAULT_BATTLE_MAP } from "@/lib/constants/battle";

describe("useBattleMapEditor", () => {
  it("вимкнено → value null; увімкнено → дефолт", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    expect(result.current.value).toBeNull();
    act(() => result.current.setEnabled(true));
    expect(result.current.value).toEqual(DEFAULT_BATTLE_MAP);
  });

  it("малювання тільки в режимі paint", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    act(() => result.current.onCellClick({ x: 1, y: 1 }));
    expect(result.current.map.blocked).toBeUndefined();

    act(() => result.current.setPaint(true));
    act(() => result.current.onCellClick({ x: 1, y: 1 }));
    expect(result.current.map.blocked).toEqual(["1:1"]);
  });

  it("збережена карта відкривається з полями, фон не змінюється", () => {
    const initial = { cols: 6, rows: 6, background: "https://x.supabase.co/a.webp", opacity: 0.5 };

    const { result } = renderHook(() => useBattleMapEditor(initial));

    act(() => result.current.setMargins({ top: 1, right: 1, bottom: 1, left: 1 }));
    expect(result.current.map.blocked).toHaveLength(20);
    expect(result.current.value?.background).toBe(initial.background);
    expect(result.current.margins.top).toBe(1);
  });

  it("зміна розміру зберігає поля й відкидає зайве", () => {
    const { result } = renderHook(() => useBattleMapEditor(null));

    act(() => result.current.setMargins({ top: 1, right: 1, bottom: 1, left: 1 }));
    act(() => result.current.setSize(10, 10));
    expect(result.current.map.blocked).toHaveLength(100 - 64);
  });
});
