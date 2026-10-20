// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Backend, captionLines, createDiceEngine, DICE_TOTAL_MS } from "../engine";

import { FX_LOAD_TIMEOUT_MS } from "@/components/battle/fx/runtime/play";
import { MAX_FX_MS } from "@/lib/utils/battle/fx";
import type { DiceThrowSpec } from "@/lib/utils/battle/fx/dice";

const spec: DiceThrowSpec = {
  seed: 7,
  groups: [
    [
      { sides: 20, value: 4, chosen: true },
      { sides: 20, value: 17, dropped: true },
    ],
    [{ sides: 6, value: 3 }],
  ],
  caption: "Айвен · атака → Біс",
  extraSaves: 0,
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

const badgeTexts = () => Array.from(host.firstElementChild?.querySelectorAll("div") ?? []).map((el) => el.textContent);

describe("dice engine", () => {
  it("the whole throw fits the FX budget, so the action FX still follows", () => {
    expect(DICE_TOTAL_MS + FX_LOAD_TIMEOUT_MS).toBeLessThanOrEqual(MAX_FX_MS);
  });

  it("badge state comes from the slot: disadvantage keeps the lower die", () => {
    const engine = createDiceEngine(host, fakeBackend);

    void engine.roll(spec);

    const badges = Array.from(host.querySelectorAll<HTMLElement>("div > div > div")).filter((el) => /^\d+$/.test(el.textContent ?? ""));

    expect(badges.map((b) => b.textContent)).toEqual(["4", "17", "3"]);
    expect(badges[0].style.background).toContain("#ffd24a");
    expect(badges[1].style.textDecoration).toBe("line-through");
    expect(badgeTexts()).toContain("Айвен · атака → Біс");
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
    expect(badgeTexts()).toEqual([]);
    expect(host.style.opacity).toBe("");
    engine.dispose();
    expect(backend.dispose).toHaveBeenCalledTimes(1);
  });

  it("cancel resolves the throw at once and clears dice and badges", async () => {
    const backend = fakeBackend();

    const engine = createDiceEngine(host, () => backend);

    let resolved = false;

    void engine.roll(spec).then(() => (resolved = true));
    await vi.advanceTimersByTimeAsync(500);
    engine.cancel();
    await Promise.resolve();

    expect(resolved).toBe(true);
    expect(backend.handles.every((h) => h.dispose.mock.calls.length === 1)).toBe(true);
    expect(badgeTexts()).toEqual([]);
    engine.dispose();
  });

  it("caption adds the hidden saves and dice beyond the limit", () => {
    expect(captionLines({ ...spec, extraSaves: 2 }, 0)).toEqual(["Айвен · атака → Біс", "+2 рятунки"]);
    expect(captionLines({ ...spec, extraSaves: 5 }, 1)).toEqual(["Айвен · атака → Біс", "+5 рятунків · +1 кубик"]);
    expect(captionLines(spec, 0)).toEqual(["Айвен · атака → Біс"]);
  });
});
