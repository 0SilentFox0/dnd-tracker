// @vitest-environment happy-dom
import { createRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  createThreeDice: vi.fn(),
  engine: { roll: vi.fn(async () => undefined), cancel: vi.fn(), dispose: vi.fn() },
}));

vi.mock("../scene", () => ({ createThreeDice: h.createThreeDice }));

import { DiceStage, type DiceStageHandle, sceneLoader } from "../DiceStage";

import type { DiceThrowSpec } from "@/lib/utils/battle/fx/dice";

const spec: DiceThrowSpec = { seed: 3, groups: [[{ sides: 20, value: 15 }]] };

const mount = () => {
  const ref = createRef<DiceStageHandle>();

  const view = render(<DiceStage ref={ref} />);

  return { ref, view };
};

beforeEach(() => {
  h.createThreeDice.mockReset().mockReturnValue(h.engine);
  h.engine.roll.mockClear();
  h.engine.cancel.mockClear();
  h.engine.dispose.mockClear();
});

afterEach(cleanup);

describe("DiceStage", () => {
  it("loads the scene once for two throws and rolls each spec", async () => {
    const { ref } = mount();

    await act(async () => {
      await ref.current?.play(spec);
      await ref.current?.play({ ...spec, seed: 4 });
    });

    expect(h.createThreeDice).toHaveBeenCalledTimes(1);
    expect(h.engine.roll).toHaveBeenCalledTimes(2);
    expect(h.engine.roll).toHaveBeenNthCalledWith(1, spec);
  });

  it("no WebGL: play resolves without rolling and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    h.createThreeDice.mockImplementation(() => {
      throw new Error("WebGL unavailable");
    });

    const { ref } = mount();

    await act(async () => {
      await expect(ref.current?.play(spec)).resolves.toBeUndefined();
      await expect(ref.current?.play(spec)).resolves.toBeUndefined();
    });

    expect(h.engine.roll).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("a cancel while the scene is loading drops the waiting throw", async () => {
    const { ref } = mount();

    await act(async () => {
      const played = ref.current?.play(spec);

      ref.current?.cancel();
      await played;
    });

    expect(h.engine.roll).not.toHaveBeenCalled();
  });

  it("cancel reaches the engine", async () => {
    const { ref } = mount();

    await act(async () => {
      await ref.current?.play(spec);
      ref.current?.cancel();
      await Promise.resolve();
    });

    expect(h.engine.cancel).toHaveBeenCalledTimes(1);
  });

  it("unmount disposes the engine", async () => {
    const { ref, view } = mount();

    await act(async () => {
      await ref.current?.play(spec);
    });
    view.unmount();
    await Promise.resolve();
    await Promise.resolve();

    expect(h.engine.dispose).toHaveBeenCalledTimes(1);
  });

  it("чанк, що вантажиться довше 800 мс: play повертається без кидка, наступний кидок використовує завантажене", async () => {
    vi.useFakeTimers();

    h.createThreeDice.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(h.engine), 1000)));

    const { ref } = mount();

    await act(async () => {
      const played = ref.current?.play(spec);

      await vi.advanceTimersByTimeAsync(850);
      await played;
    });

    expect(h.engine.roll).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await ref.current?.play(spec);
    });

    expect(h.engine.roll).toHaveBeenCalledTimes(1);
    expect(h.createThreeDice).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("невдалий import: наступний кидок пробує знову", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const load = vi.spyOn(sceneLoader, "load").mockRejectedValueOnce(new Error("chunk"));

    const { ref } = mount();

    await act(async () => {
      await ref.current?.play(spec);
    });

    expect(h.engine.roll).not.toHaveBeenCalled();

    load.mockRestore();

    await act(async () => {
      await ref.current?.play(spec);
    });

    expect(h.engine.roll).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
