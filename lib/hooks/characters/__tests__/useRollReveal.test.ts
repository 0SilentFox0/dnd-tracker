// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRollReveal } from "@/lib/hooks/characters/useRollReveal";

const steps = [
  { key: "a", pool: () => "x", final: "A" },
  { key: "b", pool: () => "y", final: "B" },
  { key: "c", pool: () => 1, final: 7 },
] as const;

const run = () => renderHook(() => useRollReveal<"a" | "b" | "c">());

describe("useRollReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("spins then settles fields one by one on schedule", () => {
    const { result } = run();

    act(() => result.current.start([...steps]));

    expect(result.current.rolling).toBe(true);
    expect(result.current.display).toEqual({ a: "x", b: "y", c: 1 });

    act(() => void vi.advanceTimersByTime(500));

    expect([...result.current.settled]).toEqual(["a"]);
    expect(result.current.display.a).toBe("A");

    act(() => void vi.advanceTimersByTime(180));

    expect([...result.current.settled]).toEqual(["a", "b"]);
    expect(result.current.rolling).toBe(true);

    act(() => void vi.advanceTimersByTime(180));

    expect(result.current.rolling).toBe(false);
    expect(result.current.display).toEqual({ a: "A", b: "B", c: 7 });
  });

  it("skip settles everything immediately", () => {
    const { result } = run();

    act(() => result.current.start([...steps]));
    act(() => result.current.skip());

    expect(result.current.rolling).toBe(false);
    expect(result.current.settled.size).toBe(3);
    expect(result.current.display).toEqual({ a: "A", b: "B", c: 7 });
  });

  it("settles instantly with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));

    const { result } = run();

    act(() => result.current.start([...steps]));

    expect(result.current.rolling).toBe(false);
    expect(result.current.display).toEqual({ a: "A", b: "B", c: 7 });
  });

  it("clears timers on unmount", () => {
    const { result, unmount } = run();

    act(() => result.current.start([...steps]));

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
