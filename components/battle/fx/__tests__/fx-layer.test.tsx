// @vitest-environment happy-dom
import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ current: { key: "k1", archetype: "haste" }, done: vi.fn(), cancelLayer: vi.fn(), playFx: vi.fn(), preloadAnimation: vi.fn() }));

vi.mock("@/components/battle/fx/fx.css", () => ({}));
vi.mock("@/components/battle/fx/runtime/play", () => ({ playFx: h.playFx, FX_LOAD_TIMEOUT_MS: 800 }));
vi.mock("@/components/battle/fx/animations", () => ({ preloadAnimation: h.preloadAnimation }));
vi.mock("@/components/battle/fx/runtime/stage", () => ({ cancelLayer: h.cancelLayer }));
vi.mock("@/lib/hooks/battle", () => ({
  useFxEnabled: () => ({ enabled: true }),
  useBattleFxQueue: () => ({ current: h.current, queue: [h.current], done: h.done, active: true }),
}));

import { BattleFxLayer } from "@/components/battle/fx/BattleFxLayer";
import { MAX_FX_MS } from "@/lib/utils/battle/fx";

beforeEach(() => {
  vi.useFakeTimers();
  h.done.mockClear();
  h.cancelLayer.mockClear();
  h.playFx.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("BattleFxLayer", () => {
  it("a stuck animation is cancelled on its stage when the guard gives up on it", async () => {
    h.playFx.mockReturnValue(new Promise(() => undefined));
    render(<BattleFxLayer />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FX_MS + 800 - 1);
    });
    expect(h.cancelLayer).not.toHaveBeenCalled();
    expect(h.done).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(h.cancelLayer).toHaveBeenCalledTimes(1);
    expect(h.done).toHaveBeenCalledWith("k1");
  });

  it("a finished animation does not cancel the stage", async () => {
    h.playFx.mockResolvedValue(undefined);
    render(<BattleFxLayer />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FX_MS * 2);
    });
    expect(h.done).toHaveBeenCalledTimes(1);
    expect(h.cancelLayer).not.toHaveBeenCalled();
    expect(h.preloadAnimation).toHaveBeenCalledWith("haste");
  });

  it("StrictMode's discarded effect pass plays once and leaves no guard behind", async () => {
    h.playFx.mockResolvedValue(undefined);
    render(
      <StrictMode>
        <BattleFxLayer />
      </StrictMode>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FX_MS * 2);
    });
    expect(h.playFx).toHaveBeenCalledTimes(1);
    expect(h.done).toHaveBeenCalledTimes(1);
  });

  it("unmounting before the run starts cancels it and its guard", async () => {
    h.playFx.mockReturnValue(new Promise(() => undefined));

    const { unmount } = render(<BattleFxLayer />);

    unmount();
    h.cancelLayer.mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FX_MS * 2);
    });
    expect(h.playFx).not.toHaveBeenCalled();
    expect(h.cancelLayer).not.toHaveBeenCalled();
    expect(h.done).not.toHaveBeenCalled();
  });

  it("a remount after unmount plays its own run", async () => {
    h.playFx.mockResolvedValue(undefined);
    render(<BattleFxLayer />).unmount();
    render(<BattleFxLayer />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FX_MS * 2);
    });
    expect(h.playFx).toHaveBeenCalledTimes(1);
    expect(h.done).toHaveBeenCalledTimes(1);
  });
});
