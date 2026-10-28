// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fireFxImpact } from "../fx-impact";
import { useHitFx } from "../useHitFx";

import type { FxImpact } from "@/lib/utils/battle/fx";

const impact = (actionId: string): FxImpact => ({ element: "fire", kind: "damage", delayMs: 600, actionId, waitMs: 4000 });

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe("useHitFx", () => {
  it("декорації з'являються лише на сигнал удару своєї дії", () => {
    const { result, rerender } = renderHook(({ hp, i }) => useHitFx<HTMLDivElement>(hp, i), { initialProps: { hp: 30, i: impact("x1") } });

    rerender({ hp: 20, i: impact("x1") });
    expect(result.current.change).toBeNull();
    act(() => fireFxImpact("x0"));
    expect(result.current.change).toBeNull();
    act(() => fireFxImpact("x1"));
    expect(result.current.change?.delta).toBe(-10);
  });

  it("без сигналу — показ через waitMs", () => {
    const { result, rerender } = renderHook(({ hp, i }) => useHitFx<HTMLDivElement>(hp, i), { initialProps: { hp: 30, i: impact("y1") } });

    rerender({ hp: 25, i: impact("y1") });
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.change?.delta).toBe(-5);
  });

  it("без впливу (FX вимкнено) — одразу", () => {
    const { result, rerender } = renderHook(({ hp }) => useHitFx<HTMLDivElement>(hp, null), { initialProps: { hp: 30 } });

    rerender({ hp: 28 });
    expect(result.current.change?.delta).toBe(-2);
  });
});
