// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prefersReducedMotion, useMediaQuery, useReducedMotion } from "@/lib/hooks/common";

function stub(initial: boolean) {
  const listeners = new Set<() => void>();

  const mql = { matches: initial, addEventListener: (_: string, cb: () => void) => listeners.add(cb), removeEventListener: (_: string, cb: () => void) => listeners.delete(cb) };

  const matchMedia = vi.fn(() => mql);

  vi.stubGlobal("matchMedia", matchMedia);

  return { matchMedia, set: (m: boolean) => { mql.matches = m; listeners.forEach((l) => l()); } };
}

afterEach(() => vi.unstubAllGlobals());

describe("useReducedMotion / useMediaQuery", () => {
  it("one MediaQueryList per query across hooks and renders; follows changes", () => {
    const mm = stub(true);

    const a = renderHook(() => useReducedMotion());

    const b = renderHook(() => useMediaQuery("(prefers-reduced-motion: reduce)"));

    a.rerender();

    expect(a.result.current).toBe(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(mm.matchMedia).toHaveBeenCalledTimes(1);

    act(() => mm.set(false));

    expect(a.result.current).toBe(false);
    expect(b.result.current).toBe(false);
  });

  it("a swapped matchMedia gets a fresh list", () => {
    stub(true);
    expect(prefersReducedMotion()).toBe(true);
    stub(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});
