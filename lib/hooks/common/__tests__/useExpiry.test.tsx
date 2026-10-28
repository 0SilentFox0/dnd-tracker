// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useExpiry } from "../useExpiry";

beforeEach(() => vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") }));
afterEach(() => vi.useRealTimers());

it("flips exactly at the expiry moment with one timer", () => {
  const { result } = renderHook(() => useExpiry("2026-01-01T00:00:10Z"));

  expect(vi.getTimerCount()).toBe(1);
  expect(result.current).toBe(false);
  act(() => { vi.advanceTimersByTime(9999); });
  expect(result.current).toBe(false);
  act(() => { vi.advanceTimersByTime(1); });
  expect(result.current).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("an already expired or missing value", () => {
  expect(renderHook(() => useExpiry("2025-12-31T00:00:00Z")).result.current).toBe(true);
  expect(renderHook(() => useExpiry(null)).result.current).toBe(false);
});
