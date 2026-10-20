// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMazeDarkAutoSkip } from "../useMazeDarkAutoSkip";
import { fakeScene, type FakeSceneOptions } from "./fake-scene";

import { mazeMap } from "@/lib/utils/battle/maze/__tests__/fixtures";

const skip = vi.fn();

const optionsSeen = vi.fn();

vi.mock("@/lib/hooks/battles", async (orig) => ({
  ...(await orig<object>()),
  useNextTurn: (_c: string, _b: string, o: unknown) => {
    optionsSeen(o);

    return { mutate: skip };
  },
}));

const map = (dark: boolean) => mazeMap({ dark }, 8, 6);

function setup(opts: FakeSceneOptions & { pending?: boolean; moraleCheck?: boolean } = {}) {
  const scene = fakeScene({ map: map(true), ...opts });

  if (opts.pending) (scene.value as { anyPending: boolean }).anyPending = true;

  if (opts.moraleCheck) scene.battle.pendingMoraleCheck = {};

  return renderHook(() => useMazeDarkAutoSkip(), { wrapper: scene.wrapper });
}

describe("useMazeDarkAutoSkip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    skip.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it("у темряві клієнт власника ходу пропускає хід через 1500 мс", () => {
    setup();
    vi.advanceTimersByTime(1499);
    expect(skip).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it("клієнт ДМ пропускає чужий хід", () => {
    setup({ isDM: true, isMyTurn: false });
    vi.advanceTimersByTime(1500);
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it("чужий гравець не пропускає", () => {
    setup({ isMyTurn: false });
    vi.advanceTimersByTime(5000);
    expect(skip).not.toHaveBeenCalled();
  });

  it("на світлі не пропускає", () => {
    setup({ map: map(false) });
    vi.advanceTimersByTime(5000);
    expect(skip).not.toHaveBeenCalled();
  });

  it("не пропускає, коли бій не активний, є pending або перевірка моралі", () => {
    setup({ status: "completed" });
    setup({ pending: true });
    setup({ moraleCheck: true });
    vi.advanceTimersByTime(5000);
    expect(skip).not.toHaveBeenCalled();
  });

  it("409 не показує тост", () => {
    setup();

    const { onConflict } = optionsSeen.mock.calls[0][0] as { onConflict: () => void };

    expect(onConflict()).toBeUndefined();
  });
});
