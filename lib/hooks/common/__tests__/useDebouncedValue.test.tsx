// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "@/lib/hooks/common";

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe("useDebouncedValue", () => {
  it("починає з поточного значення, оновлюється після паузи й скидає таймер при новій зміні", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: "a" } });

    expect(result.current).toBe("a");

    rerender({ v: "ab" });
    act(() => void vi.advanceTimersByTime(200));
    rerender({ v: "abc" });
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current).toBe("a");

    act(() => void vi.advanceTimersByTime(100));
    expect(result.current).toBe("abc");
  });
});
