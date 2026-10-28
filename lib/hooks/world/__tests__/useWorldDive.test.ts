// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useWorldDive } from "../useWorldDive";

import type { WorldMap, WorldMarker } from "@/types/world";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const root = { map: { id: "m1", parentMarkerId: null, parentMapId: null } as WorldMap, markers: [{ id: "k1", x: 0.3, y: 0.6 } as WorldMarker] };

const child = { map: { id: "m2", parentMarkerId: "k1", parentMapId: "m1" } as WorldMap, markers: [] as WorldMarker[] };

const sibling = { map: { id: "m3", parentMarkerId: null, parentMapId: null } as WorldMap, markers: [] as WorldMarker[] };

describe("useWorldDive", () => {
  it("провал: dive 600 мс зі старою картою, потім reveal 300 мс, потім idle", () => {
    const { result, rerender } = renderHook(({ v, r }) => useWorldDive(v, r), { initialProps: { v: root as typeof root | undefined, r: false } });

    expect(result.current.shown).toBe(root);

    rerender({ v: child, r: false });

    expect(result.current.phase).toBe("dive");
    expect(result.current.origin).toEqual({ x: 0.3, y: 0.6 });
    expect(result.current.shown).toBe(root);

    act(() => void vi.advanceTimersByTime(600));

    expect(result.current.phase).toBe("reveal");
    expect(result.current.shown).toBe(child);

    act(() => void vi.advanceTimersByTime(300));

    expect(result.current.phase).toBe("idle");
  });

  it("без точки провалу — лише reveal", () => {
    const { result, rerender } = renderHook(({ v }) => useWorldDive(v, false), { initialProps: { v: root as typeof root | undefined } });

    rerender({ v: sibling });

    expect(result.current.phase).toBe("reveal");
    expect(result.current.origin).toBeNull();
    expect(result.current.shown).toBe(sibling);
  });

  it("reduced motion — одразу нова карта", () => {
    const { result, rerender } = renderHook(({ v }) => useWorldDive(v, true), { initialProps: { v: root as typeof root | undefined } });

    rerender({ v: child });

    expect(result.current.phase).toBe("idle");
    expect(result.current.shown).toBe(child);
  });

  it("поки нова карта вантажиться (undefined) — тримає стару", () => {
    const { result, rerender } = renderHook(({ v }) => useWorldDive(v, false), { initialProps: { v: root as typeof root | undefined } });

    rerender({ v: undefined });

    expect(result.current.shown).toBe(root);
    expect(result.current.phase).toBe("idle");
  });

  it("таймери прибираються при unmount", () => {
    const { rerender, unmount } = renderHook(({ v }) => useWorldDive(v, false), { initialProps: { v: root as typeof root | undefined } });

    rerender({ v: child });
    unmount();

    expect(() => vi.runAllTimers()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
