// @vitest-environment happy-dom
import { forwardRef, StrictMode, useImperativeHandle } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  current: { key: "k1", archetype: "haste" } as { key: string; archetype: string; dice?: unknown },
  active: true,
  done: vi.fn(),
  cancelLayer: vi.fn(),
  playFx: vi.fn(),
  preloadAnimation: vi.fn(),
  dicePlay: vi.fn(),
  diceCancel: vi.fn(),
}));

vi.mock("@/components/battle/fx/fx.css", () => ({}));
vi.mock("@/components/battle/fx/runtime/play", () => ({ playFx: h.playFx, FX_LOAD_TIMEOUT_MS: 800 }));
vi.mock("@/components/battle/fx/animations", () => ({ preloadAnimation: h.preloadAnimation }));
vi.mock("@/components/battle/fx/runtime/stage", () => ({ cancelLayer: h.cancelLayer }));
vi.mock("@/components/battle/fx/dice/DiceStage", () => ({
  DiceStage: forwardRef(function DiceStage(_, ref) {
    useImperativeHandle(ref, () => ({ play: h.dicePlay, cancel: h.diceCancel }));

    return null;
  }),
}));
vi.mock("@/lib/hooks/battle", () => ({
  useFxEnabled: () => ({ enabled: true }),
  useBattleFxQueue: () => ({ current: h.current, queue: [h.current], done: h.done, active: h.active }),
}));

import { BattleFxLayer } from "@/components/battle/fx/BattleFxLayer";
import { MAX_FX_MS } from "@/lib/utils/battle/fx";
import { DICE_TOTAL_MS } from "@/lib/utils/battle/fx/dice";

beforeEach(() => {
  vi.useFakeTimers();
  h.done.mockClear();
  h.cancelLayer.mockClear();
  h.playFx.mockReset();
  h.dicePlay.mockReset();
  h.diceCancel.mockReset();
  h.current = { key: "k1", archetype: "haste" };
  h.active = true;
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

  it("a dice throw plays on the dice stage and finishes when it lands", async () => {
    let land = () => undefined as void;

    h.current = { key: "d1", archetype: "dice", dice: { seed: 1, groups: [] } };
    h.dicePlay.mockReturnValue(new Promise<void>((resolve) => (land = resolve)));
    render(<BattleFxLayer />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(h.dicePlay).toHaveBeenCalledWith(h.current.dice);
    expect(h.playFx).not.toHaveBeenCalled();
    expect(h.done).not.toHaveBeenCalled();

    await act(async () => {
      land();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(h.done).toHaveBeenCalledWith("d1");
    expect(h.diceCancel).not.toHaveBeenCalled();
  });

  it("a dice throw that never lands is cancelled and the queue moves on", async () => {
    h.current = { key: "d1", archetype: "dice", dice: { seed: 1, groups: [] } };
    h.dicePlay.mockReturnValue(new Promise(() => undefined));
    render(<BattleFxLayer />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800 + DICE_TOTAL_MS + 300);
    });
    expect(h.diceCancel).toHaveBeenCalled();
    expect(h.done).toHaveBeenCalledWith("d1");
  });

  it("turning FX off cancels the dice stage", async () => {
    h.dicePlay.mockReturnValue(new Promise(() => undefined));

    const view = render(<BattleFxLayer />);

    h.active = false;
    view.rerender(<BattleFxLayer />);
    expect(h.diceCancel).toHaveBeenCalledTimes(1);
    expect(h.cancelLayer).toHaveBeenCalledTimes(1);
  });
});
