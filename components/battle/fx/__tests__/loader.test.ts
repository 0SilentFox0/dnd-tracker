// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { FX_ARCHETYPES } from "@/lib/utils/battle/fx";

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("../animations/haste");
  vi.doUnmock("../animations/slow");
  vi.resetModules();
});

describe("animation loader", () => {
  it("every archetype loads to an animation", async () => {
    const { loadAnimation } = await import("../animations");

    for (const a of FX_ARCHETYPES) expect(typeof (await loadAnimation(a))).toBe("function");
  });

  it("a signature whose chunk is late plays its base fallback, and the real one once it is in", async () => {
    vi.resetModules();

    let arrive!: () => void;

    const real = vi.fn();

    vi.doMock("../animations/haste", () => new Promise((resolve) => (arrive = () => resolve({ haste: real }))));

    const { animationFor } = await import("../animations");

    const { buff } = await import("../animations/buff");

    vi.useFakeTimers();

    const first = animationFor("haste", 800);

    await vi.advanceTimersByTimeAsync(800);
    await expect(first).resolves.toBe(buff);

    vi.useRealTimers();
    await vi.waitFor(() => expect(arrive).toBeTypeOf("function"));
    arrive();
    await expect(animationFor("haste", 800)).resolves.toBe(real);
  });

  it("a failed chunk falls back to the base animation", async () => {
    vi.resetModules();
    vi.doMock("../animations/slow", () => {
      throw new Error("chunk");
    });

    const { animationFor } = await import("../animations");

    const { debuff } = await import("../animations/debuff");

    await expect(animationFor("slow", Infinity)).resolves.toBe(debuff);
  });
});

describe("playFx", () => {
  it("drops a run cancelled while its chunk was loading", async () => {
    vi.resetModules();

    let arrive!: () => void;

    const real = vi.fn(() => Promise.resolve());

    vi.doMock("../animations/haste", () => new Promise((resolve) => (arrive = () => resolve({ haste: real }))));

    const { playFx } = await import("../runtime/play");

    const { cancelLayer } = await import("../runtime/stage");

    const layer = document.createElement("div");

    document.body.append(layer);

    const run = playFx(layer, { key: "k", archetype: "haste", element: "wind", actorId: "a", actorSide: "player", targetIds: [], hit: true, critical: false }, document, Infinity);

    cancelLayer(layer);
    await vi.waitFor(() => expect(arrive).toBeTypeOf("function"));
    arrive();
    await run;

    expect(real).not.toHaveBeenCalled();
  });
});
