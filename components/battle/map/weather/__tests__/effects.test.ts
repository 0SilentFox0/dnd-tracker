import { describe, expect, it } from "vitest";

import { WEATHER_EFFECTS } from "../index";
import { createRain } from "../rain";
import { createStorm, FLASH_SEC } from "../storm";
import { particleCount } from "../types";

import { recordingContext } from "@/components/battle/fx/__tests__/recording-canvas";
import { WEATHER_KINDS } from "@/lib/constants/battle-weather";

const size = { width: 800, height: 600 };

const fixed = (v: number) => () => v;

function pointsContext() {
  const ys: number[] = [];

  const g = recordingContext();

  (g as unknown as { moveTo: (x: number, y: number) => void }).moveTo = (_x, y) => ys.push(y);

  return { g, ys };
}

describe("particleCount", () => {
  it("росте з площею, обрізається стелею, на телефоні — половина", () => {
    const effect = { density: 300, cap: 200 };

    expect(particleCount({ width: 500, height: 400 }, effect)).toBe(60);
    expect(particleCount({ width: 4000, height: 3000 }, effect)).toBe(200);
    expect(particleCount({ width: 4000, height: 3000 }, effect, 0.5)).toBe(100);
  });
});

describe("ефекти погоди", () => {
  it.each(WEATHER_KINDS)("%s: 3 с кроків і малювання без винятків, щось намальовано", (kind) => {
    const effect = WEATHER_EFFECTS[kind];

    const sim = effect.create(size, particleCount(size, effect), Math.random);

    const g = recordingContext();

    for (let i = 0; i < 90; i++) {
      sim.step(1 / 30);
      sim.draw(g);
    }

    expect(g.rec.calls.some((c) => c === "stroke" || c === "fill" || c === "fillRect")).toBe(true);
    expect(effect.opacity).toBeGreaterThan(0);
    expect(effect.opacity).toBeLessThan(1);
  });

  it("дощ падає вниз екрана", () => {
    const sim = createRain(size, 1, fixed(0.5), { wind: 0, minSpeed: 600, maxSpeed: 600, color: "#fff" });

    const before = pointsContext();

    sim.draw(before.g);
    sim.step(0.1);

    const after = pointsContext();

    sim.draw(after.g);

    expect(after.ys[0] - before.ys[0]).toBeCloseTo(60);
  });

  it("гроза: перший спалах через 6–15 с і гасне за FLASH_SEC", () => {
    const sim = createStorm(size, 10, fixed(0));

    const flashes = () => {
      const g = recordingContext();

      sim.draw(g);

      return g.rec.calls.filter((c) => c === "fillRect").length;
    };

    sim.step(5.9);
    expect(flashes()).toBe(0);

    sim.step(0.2);
    expect(flashes()).toBe(1);

    sim.step(FLASH_SEC + 0.01);
    expect(flashes()).toBe(0);
  });
});
