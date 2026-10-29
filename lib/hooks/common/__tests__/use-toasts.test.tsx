// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useToasts } from "../useToasts";

describe("useToasts", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  it("expires a toast after 6 seconds", () => {
    const { result } = renderHook(() => useToasts());

    act(() => result.current.push({ id: "a", text: "A" }));
    expect(result.current.toasts).toHaveLength(1);

    act(() => void vi.advanceTimersByTime(6000));
    expect(result.current.toasts).toHaveLength(0);
  });

  it("dismiss removes the toast and its timer does not fire later", () => {
    const { result } = renderHook(() => useToasts());

    act(() => result.current.push({ id: "a", text: "A" }));
    act(() => result.current.dismiss("a"));
    expect(result.current.toasts).toHaveLength(0);

    act(() => result.current.push({ id: "b", text: "B" }));
    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current.toasts).toHaveLength(1);
  });

  it("does not duplicate a toast with the same id", () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.push({ id: "a", text: "A" });
      result.current.push({ id: "a", text: "A" });
    });
    expect(result.current.toasts).toHaveLength(1);
  });

  it("keeps at most 3, evicting the oldest", () => {
    const { result } = renderHook(() => useToasts());

    act(() => ["a", "b", "c", "d"].forEach((id) => result.current.push({ id, text: id })));

    expect(result.current.toasts.map((t) => t.id)).toEqual(["b", "c", "d"]);
  });
});
