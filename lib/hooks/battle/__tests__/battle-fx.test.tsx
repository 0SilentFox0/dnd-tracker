// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { action } from "@/lib/utils/battle/fx/__tests__/action-fixture";
import type { BattleAction } from "@/types/battle";

function stubReducedMotion(initial: boolean) {
  const listeners = new Set<() => void>();

  const mql = { matches: initial, addEventListener: (_: string, cb: () => void) => listeners.add(cb), removeEventListener: (_: string, cb: () => void) => listeners.delete(cb) };

  const matchMedia = vi.fn(() => mql);

  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    set(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((l) => l());
    },
  };
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

async function load() {
  vi.resetModules();

  return import("@/lib/hooks/battle");
}

beforeEach(() => window.localStorage.clear());

afterEach(() => {
  vi.unstubAllGlobals();
  setHidden(false);
});

describe("useFxEnabled", () => {
  it("reduced motion: user toggle stays on, action FX off; reacts to the media change; one MediaQueryList", async () => {
    const motion = stubReducedMotion(true);

    const { useFxEnabled } = await load();

    const a = renderHook(() => useFxEnabled());

    const b = renderHook(() => useFxEnabled());

    expect(a.result.current).toMatchObject({ userEnabled: true, motionAllowed: false, enabled: false });

    act(() => motion.set(false));

    expect(a.result.current).toMatchObject({ userEnabled: true, motionAllowed: true, enabled: true });
    expect(b.result.current.enabled).toBe(true);
    expect(motion.matchMedia).toHaveBeenCalledTimes(1);
  });

  it("user toggle off disables everything", async () => {
    stubReducedMotion(false);

    const { useFxEnabled } = await load();

    const { result } = renderHook(() => useFxEnabled());

    act(() => result.current.setEnabled(false));

    expect(result.current).toMatchObject({ userEnabled: false, motionAllowed: true, enabled: false });
  });
});

describe("useBattleFxQueue", () => {
  const melee = (i: number) => action({ actionIndex: i, id: `b-${i}`, actionType: "attack", actionDetails: { attackKind: "melee", isHit: true } });

  const range = (to: number) => Array.from({ length: to }, (_, i) => melee(i + 1));

  it("hidden tab queues nothing and drops the pending queue; return plays only new actions", async () => {
    const { BattleSceneDataContext, useBattleFxQueue } = await load();

    let log: BattleAction[] = range(1);

    const wrapper = ({ children }: { children: ReactNode }) => <BattleSceneDataContext.Provider value={{ battle: { battleLog: log } } as never}>{children}</BattleSceneDataContext.Provider>;

    const { result, rerender } = renderHook(() => useBattleFxQueue(true), { wrapper });

    log = range(3);
    rerender();

    expect(result.current.current?.key).toBe("b-2:0");

    act(() => setHidden(true));

    expect(result.current).toMatchObject({ current: null, active: false });

    log = range(8);
    rerender();

    expect(result.current.current).toBeNull();

    act(() => setHidden(false));

    expect(result.current.current).toBeNull();

    log = range(9);
    rerender();

    expect(result.current.current?.key).toBe("b-9:0");

    act(() => result.current.done("b-9:0"));

    expect(result.current.current).toBeNull();
  });

  it("FX off with a pending queue → current null", async () => {
    const { BattleSceneDataContext, useBattleFxQueue } = await load();

    let log: BattleAction[] = range(1);

    const wrapper = ({ children }: { children: ReactNode }) => <BattleSceneDataContext.Provider value={{ battle: { battleLog: log } } as never}>{children}</BattleSceneDataContext.Provider>;

    const { result, rerender } = renderHook(({ on }) => useBattleFxQueue(on), { wrapper, initialProps: { on: true } });

    log = range(3);
    rerender({ on: true });

    expect(result.current.current).not.toBeNull();

    rerender({ on: false });

    expect(result.current.current).toBeNull();

    rerender({ on: true });

    expect(result.current.current).toBeNull();
  });
});
