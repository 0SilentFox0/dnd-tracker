// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStorageFlag, useStorageFlag } from "@/lib/hooks/common/storage-flag";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("createStorageFlag", () => {
  it("default when unset; unknown values fall back to the default", () => {
    expect(createStorageFlag("f1", true).get()).toBe(true);
    window.localStorage.setItem("f2", "junk");
    expect(createStorageFlag("f2", true).get()).toBe(true);
    window.localStorage.setItem("f3", "off");
    expect(createStorageFlag("f3", true).get()).toBe(false);
  });

  it("reads localStorage once, not per snapshot", () => {
    const flag = createStorageFlag("f4", true);

    const getItem = vi.spyOn(window.localStorage, "getItem");

    const { result, rerender } = renderHook(() => useStorageFlag(flag));

    rerender();
    rerender();

    expect(result.current).toBe(true);
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it("set persists and notifies; a storage event from another tab re-reads", () => {
    const flag = createStorageFlag("f5", true);

    const { result } = renderHook(() => useStorageFlag(flag));

    act(() => flag.set(false));

    expect(result.current).toBe(false);
    expect(window.localStorage.getItem("f5")).toBe("off");

    window.localStorage.setItem("f5", "on");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "f5" }));
    });

    expect(result.current).toBe(true);
  });
});
