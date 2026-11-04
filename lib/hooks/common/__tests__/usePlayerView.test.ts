// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSessionFlag } from "@/lib/hooks/common/storage-value";
import { resetPlayerViews, usePlayerView } from "@/lib/hooks/common/usePlayerView";
import { PLAYER_VIEW_PENDING_ATTR } from "@/lib/utils/common/player-view";

afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("createSessionFlag", () => {
  it("persists in sessionStorage only", () => {
    const flag = createSessionFlag("sf1");

    flag.set(true);

    expect(window.sessionStorage.getItem("sf1")).toBe("on");
    expect(window.localStorage.getItem("sf1")).toBeNull();
    expect(createSessionFlag("sf1").get()).toBe(true);
  });

  it("ignores storage events", () => {
    const flag = createSessionFlag("sf2");

    const onChange = vi.fn();

    expect(flag.get()).toBe(false);

    const unsubscribe = flag.subscribe(onChange);

    window.sessionStorage.setItem("sf2", "on");
    window.dispatchEvent(new StorageEvent("storage", { key: "sf2", newValue: "on" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(flag.get()).toBe(false);
    unsubscribe();
  });
});

describe("usePlayerView", () => {
  it("is off by default and toggles", () => {
    const { result } = renderHook(() => usePlayerView({ kind: "battle", id: "b1" }));

    expect(result.current.enabled).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
    act(() => result.current.set(false));
    expect(result.current.enabled).toBe(false);
  });

  it("uses separate keys per entity and kind", () => {
    const a = renderHook(() => usePlayerView({ kind: "battle", id: "b1" }));

    const b = renderHook(() => usePlayerView({ kind: "battle", id: "b2" }));

    const s = renderHook(() => usePlayerView({ kind: "show", id: "b1" }));

    act(() => a.result.current.set(true));

    expect(a.result.current.enabled).toBe(true);
    expect(b.result.current.enabled).toBe(false);
    expect(s.result.current.enabled).toBe(false);
    expect(window.sessionStorage.getItem("player-view:b1")).toBe("on");

    act(() => s.result.current.set(true));
    expect(window.sessionStorage.getItem("player-view:show:b1")).toBe("on");
  });

  it("survives throwing storage and keeps in-memory state", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });

    const { result } = renderHook(() => usePlayerView({ kind: "battle", id: "throwing" }));

    expect(result.current.enabled).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.enabled).toBe(true);
  });

  it("null scope is always off and never touches storage", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");

    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const { result } = renderHook(() => usePlayerView(null));

    act(() => result.current.toggle());
    act(() => result.current.set(true));

    expect(result.current.enabled).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("resetPlayerViews", () => {
  it("turns off live stores and clears stored player-view keys only", () => {
    const { result } = renderHook(() => usePlayerView({ kind: "battle", id: "rb1" }));

    act(() => result.current.set(true));
    window.sessionStorage.setItem("player-view:other", "on");
    window.sessionStorage.setItem("keep", "on");

    act(() => resetPlayerViews());

    expect(result.current.enabled).toBe(false);
    expect(window.sessionStorage.getItem("player-view:other")).toBeNull();
    expect(window.sessionStorage.getItem("keep")).toBe("on");
  });
});

describe("usePlayerView guard reveal", () => {
  it("clears the pending attribute once the consumer has read the flag", () => {
    window.sessionStorage.setItem("player-view:rv1", "on");
    document.documentElement.setAttribute(PLAYER_VIEW_PENDING_ATTR, "1");

    const { result } = renderHook(() => usePlayerView({ kind: "battle", id: "rv1" }));

    expect(result.current.enabled).toBe(true);
    expect(document.documentElement.hasAttribute(PLAYER_VIEW_PENDING_ATTR)).toBe(false);
  });
});
