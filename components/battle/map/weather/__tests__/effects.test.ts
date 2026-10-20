import { describe, expect, it } from "vitest";

import { BLACK_SNOW, createCrypt, FIREFLY_RGB, fireflyGlow } from "../crypt";
import { createDrift } from "../drift";
import { createEmbers } from "../embers";
import { WEATHER_EFFECTS } from "../index";
import { createRain } from "../rain";
import { createStorm, FLASH_SEC, nextFlashIn } from "../storm";
import { particleCount, type WeatherSim } from "../types";

import { WEATHER_KINDS } from "@/lib/constants/battle-weather";
import { type RecordedCall, recordingContext } from "@/lib/utils/canvas/__tests__/recording-canvas";
import type { WeatherKind } from "@/types/battle";

const size = { width: 800, height: 600 };

const fixed = (v: number) => () => v;

function frame(sim: WeatherSim): RecordedCall[] {
  const g = recordingContext();

  sim.draw(g);

  return g.rec.args;
}

const calls = (rec: RecordedCall[], method: string) => rec.filter((c) => c.method === method);

const point = (c: RecordedCall) => ({ x: Number(c.args[0]), y: Number(c.args[1]) });

const alpha = (style: unknown) => Number(/,\s*([\d.]+)\)$/.exec(String(style))?.[1] ?? 0);

const isFullFrame = (c: RecordedCall) => c.method === "fillRect" && c.args[0] === 0 && c.args[1] === 0 && c.args[2] === size.width && c.args[3] === size.height;

const fullFrames = (rec: RecordedCall[]) => rec.filter(isFullFrame);

describe("particleCount", () => {
  it("росте пропорційно площі", () => {
    const effect = { density: 300 };

    expect(particleCount({ width: 1000, height: 400 }, effect)).toBe(2 * particleCount({ width: 500, height: 400 }, effect));
  });

  it("обрізається стелею, а без стелі — густиною на мегапіксель", () => {
    const huge = { width: 4000, height: 3000 };

    expect(particleCount(huge, { density: 300, maxParticles: 200 })).toBe(200);
    expect(particleCount(huge, { density: 300 })).toBe(300);
  });

  it("на телефоні — половина, але не менше мінімуму", () => {
    const huge = { width: 4000, height: 3000 };

    expect(particleCount(huge, { density: 300, maxParticles: 200 }, 0.5)).toBe(100);
    expect(particleCount({ width: 10, height: 10 }, { density: 14, minParticles: 6 }, 0.5)).toBe(6);
  });

  it.each(WEATHER_KINDS)("%s: є частинки на звичайній рамці, на телефоні — не більше", (kind) => {
    const effect = WEATHER_EFFECTS[kind];

    expect(particleCount(size, effect)).toBeGreaterThan(0);
    expect(particleCount(size, effect, 0.5)).toBeLessThanOrEqual(particleCount(size, effect));
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

  // дощ, сніг і гробниця загортаються по краях; запас — довжина струменя чи радіус пластівця
  it.each<WeatherKind>(["rain", "storm", "snow", "blizzard", "crypt"])("%s: частинки лишаються в рамці", (kind) => {
    const effect = WEATHER_EFFECTS[kind];

    const sim = effect.create(size, particleCount(size, effect), Math.random);

    const margin = 70;

    for (let i = 0; i < 150; i++) {
      sim.step(1 / 30);

      if (i % 15) continue;

      for (const c of frame(sim).filter((c) => c.method === "arc" || c.method === "moveTo" || c.method === "lineTo")) {
        const { x, y } = point(c);

        expect(x).toBeGreaterThanOrEqual(-margin);
        expect(x).toBeLessThanOrEqual(size.width + margin);
        expect(y).toBeGreaterThanOrEqual(-margin);
        expect(y).toBeLessThanOrEqual(size.height + margin);
      }
    }
  });

  it("кількість намальованих частинок дорівнює заданій", () => {
    for (const n of [20, 40]) {
      expect(calls(frame(WEATHER_EFFECTS.rain.create(size, n, Math.random)), "moveTo")).toHaveLength(n);
      expect(calls(frame(WEATHER_EFFECTS.snow.create(size, n, Math.random)), "arc")).toHaveLength(n);
    }
  });

  it("дощ падає вниз екрана", () => {
    const sim = createRain(size, 1, fixed(0.5), { wind: 0, minSpeed: 600, maxSpeed: 600, color: "#fff", lineWidth: 1, haze: "#0000" });

    const before = point(calls(frame(sim), "moveTo")[0]);

    sim.step(0.1);

    const after = point(calls(frame(sim), "moveTo")[0]);

    expect(after.y - before.y).toBeCloseTo(60);
  });

  it("гроза: пауза між спалахами — від 6 до 15 с", () => {
    expect(nextFlashIn(fixed(0))).toBe(6);
    expect(nextFlashIn(fixed(1))).toBe(15);
  });

  it.each([
    [0, 6],
    [0.999, 14.99],
  ])("гроза (rand=%s): спалах на %s с і гасне за FLASH_SEC", (r, at) => {
    const sim = createStorm(size, 10, fixed(r));

    // спалах — друга заливка на всю рамку поверх затемнення дощу
    const lit = () => fullFrames(frame(sim)).length > 1;

    sim.step(at - 0.1);
    expect(lit()).toBe(false);

    sim.step(0.2);
    expect(lit()).toBe(true);

    sim.step(FLASH_SEC + 0.01);
    expect(lit()).toBe(false);
  });

  it("гроза: спалах слабне, поки гасне", () => {
    const sim = createStorm(size, 10, fixed(0));

    const flash = () => alpha(fullFrames(frame(sim)).at(-1)?.fillStyle);

    sim.step(6);

    const a = flash();

    sim.step(FLASH_SEC / 2);

    expect(flash()).toBeLessThan(a);
  });

  it("гроза темніша за дощ, але HP під токенами читається", () => {
    const darkness = (kind: "rain" | "storm") => alpha(fullFrames(frame(WEATHER_EFFECTS[kind].create(size, 10, Math.random)))[0].fillStyle);

    expect(darkness("storm")).toBeGreaterThan(darkness("rain"));
    // затемнення шару не густіше за третину
    expect(darkness("storm") * WEATHER_EFFECTS.storm.opacity).toBeLessThan(0.34);
  });

  it("вогонь: іскри здіймаються й тьмяніють, сяйво тримається низу рамки", () => {
    const sim = createEmbers(size, 1, fixed(0.5));

    const spark = () => {
      const [c] = calls(frame(sim), "arc");

      return { ...point(c), alpha: alpha(c.fillStyle) };
    };

    const a = spark();

    sim.step(0.5);

    const b = spark();

    expect(b.y).toBeLessThan(a.y);
    expect(b.alpha).toBeLessThan(a.alpha);

    const glow = calls(frame(sim), "fillRect").filter((c) => !isFullFrame(c) && Number(c.args[1]) + Number(c.args[3]) === size.height);

    expect(glow.length).toBeGreaterThan(0);
  });

  it("дим тримається смуги зверху", () => {
    const sim = createDrift(size, 20, Math.random, { vx: 8, vy: 0, color: "#000", clear: "#0000", minR: 0.2, maxR: 0.3, band: [0, 0.25] });

    sim.step(30);

    const ys = calls(frame(sim), "createRadialGradient").map((c) => point(c).y);

    expect(ys).toHaveLength(20);
    expect(Math.max(...ys)).toBeLessThanOrEqual(size.height * 0.25);
  });

  it("гробниця: без туману — єдиний градієнт кадру це віньєтка на всю рамку, що пульсує", () => {
    const sim = createCrypt(size, particleCount(size, WEATHER_EFFECTS.crypt), Math.random);

    const vignette = () => {
      const rec = frame(sim);

      expect(calls(rec, "createRadialGradient")).toHaveLength(1);
      expect(calls(rec, "fillRect").at(-1)).toSatisfy(isFullFrame);

      return Math.max(...calls(rec, "addColorStop").map((c) => alpha(c.args[1])));
    };

    const a = vignette();

    sim.step(2);

    expect(vignette()).not.toBeCloseTo(a, 3);
  });

  it("гробниця: чорний сніг летить по діагоналі, вітер поривами", () => {
    const sim = createCrypt(size, 40, fixed(0.5));

    const flake = () => point(calls(frame(sim), "arc").filter((c) => c.fillStyle === BLACK_SNOW)[0]);

    const a = flake();

    sim.step(0.5);

    const b = flake();

    expect(b.y).toBeGreaterThan(a.y);
    expect(b.x).not.toBeCloseTo(a.x, 0);

    // зсув за однакові пів секунди в різні моменти різний — це пориви, а не рівний вітер
    sim.step(2);

    const c = flake();

    sim.step(0.5);

    const d = flake();

    expect(Math.abs((d.x - c.x) - (b.x - a.x))).toBeGreaterThan(2);
  });

  it("гробниця: зелені світлячки блукають і блимають", () => {
    const sim = createCrypt(size, 40, fixed(0.5));

    const visible: number[] = [];

    const spots = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const fly = calls(frame(sim), "arc").filter((c) => String(c.fillStyle).startsWith(`rgba(${FIREFLY_RGB},`));

      visible.push(fly.length);

      for (const c of fly) spots.add(`${Math.round(point(c).x)}:${Math.round(point(c).y)}`);
      sim.step(0.1);
    }

    expect(Math.min(...visible)).toBe(0);
    expect(Math.max(...visible)).toBeGreaterThan(0);
    expect(spots.size).toBeGreaterThan(5);
    expect(fireflyGlow(-Math.PI / 2)).toBe(0);
    expect(fireflyGlow(Math.PI / 2)).toBe(1);
  });

  it("гробниця без руху — темне нейтральне затінення, не зелений туман", () => {
    for (const [, r, g, b] of WEATHER_EFFECTS.crypt.tint.matchAll(/rgba\((\d+),(\d+),(\d+),/g)) expect(Math.max(+r, +g, +b) - Math.min(+r, +g, +b)).toBeLessThanOrEqual(4);
  });
});
