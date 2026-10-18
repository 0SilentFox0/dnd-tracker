// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useDamageShake, useHpChange } from "../useHpChange";

describe("useHpChange", () => {
  it("на першому рендері нічого; при зміні — дельта і новий id", () => {
    const { result, rerender } = renderHook(({ hp }) => useHpChange(hp), { initialProps: { hp: 20 } });

    expect(result.current).toBeNull();

    rerender({ hp: 12 });

    expect(result.current).toEqual({ delta: -8, id: 1 });

    rerender({ hp: 20 });

    expect(result.current).toEqual({ delta: 8, id: 2 });
  });
});

describe("useDamageShake", () => {
  afterEach(() => vi.useRealTimers());

  it("тремтіння стартує після delayMs", () => {
    vi.useFakeTimers();

    const animate = vi.fn();

    const { rerender } = renderHook(
      ({ change }) => {
        const ref = useDamageShake<HTMLDivElement>(change, 300);

        if (!ref.current) ref.current = { animate } as unknown as HTMLDivElement;

        return ref;
      },
      { initialProps: { change: null as { delta: number; id: number } | null } },
    );

    rerender({ change: { delta: -5, id: 1 } });

    expect(animate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);

    expect(animate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(animate).toHaveBeenCalledTimes(1);
  });
});
