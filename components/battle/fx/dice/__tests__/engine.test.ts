// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Backend, createDiceEngine } from "../engine";

import type { DiceThrowSpec } from "@/lib/utils/battle/fx/dice";
import { DICE_TOTAL_MS } from "@/lib/utils/battle/fx/dice";

const spec: DiceThrowSpec = {
  seed: 7,
  groups: [
    [
      { sides: 20, value: 4, chosen: true },
      { sides: 20, value: 17, dropped: true },
    ],
    [{ sides: 6, value: 3 }],
  ],
};

function fakeBackend() {
  const handles: { dispose: ReturnType<typeof vi.fn>; setPose: ReturnType<typeof vi.fn> }[] = [];

  const backend: Backend & { handles: typeof handles } = {
    handles,
    resize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    createDie: vi.fn(() => {
      const h = { setPose: vi.fn(), dispose: vi.fn() };

      handles.push(h);

      return h;
    }),
  };

  return backend;
}

let host: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  host.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("dice engine", () => {
  it("no text over the dice; the dropped die is passed to the backend to dim", () => {
    const backend = fakeBackend();

    const engine = createDiceEngine(host, () => backend);

    void engine.roll(spec);

    expect(host.textContent).toBe("");
    expect(backend.createDie).toHaveBeenNthCalledWith(2, expect.objectContaining({ sides: 20, value: 17, dropped: true }));
    engine.dispose();
  });

  it("resolves after DICE_TOTAL_MS and leaves the screen clean", async () => {
    const backend = fakeBackend();

    const engine = createDiceEngine(host, () => backend);

    let resolved = false;

    void engine.roll(spec).then(() => (resolved = true));

    expect(backend.createDie).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(DICE_TOTAL_MS - 100);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(true);
    expect(backend.handles.every((h) => h.dispose.mock.calls.length === 1)).toBe(true);
    expect(host.style.opacity).toBe("");
    engine.dispose();
    expect(backend.dispose).toHaveBeenCalledTimes(1);
  });

  it("cancel resolves the throw at once and clears the dice", async () => {
    const backend = fakeBackend();

    const engine = createDiceEngine(host, () => backend);

    let resolved = false;

    void engine.roll(spec).then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(500);
    engine.cancel();
    await Promise.resolve();

    expect(resolved).toBe(true);
    expect(backend.handles.every((h) => h.dispose.mock.calls.length === 1)).toBe(true);
    engine.dispose();
  });

});
