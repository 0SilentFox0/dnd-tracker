import { describe, expect, it } from "vitest";

import { BLACK_SNOW, createCrypt, FIREFLY_RGB, fireflyGlow } from "../crypt";
import { createDrift } from "../drift";
import { createEmbers } from "../embers";
import { WEATHER_EFFECTS } from "../index";
import { createRain } from "../rain";
import { createStorm, FLASH_SEC } from "../storm";
import { particleCount } from "../types";

import { recordingContext } from "@/components/battle/fx/__tests__/recording-canvas";
import { WEATHER_KINDS } from "@/lib/constants/battle-weather";

const size = { width: 800, height: 600 };

const fixed = (v: number) => () => v;

function fillRects() {
  const rects: Array<{ x: number; y: number; w: number; h: number; style: unknown }> = [];

  const g = recordingContext();

  (g as unknown as { fillRect: (x: number, y: number, w: number, h: number) => void }).fillRect = (x, y, w, h) => rects.push({ x, y, w, h, style: g.fillStyle });

  return { g, rects };
}

const alpha = (style: unknown) => Number(/,\s*([\d.]+)\)$/.exec(String(style))?.[1] ?? 0);

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
    const sim = createRain(size, 1, fixed(0.5), { wind: 0, minSpeed: 600, maxSpeed: 600, color: "#fff", lineWidth: 1, haze: "#0000" });

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
      const { g, rects } = fillRects();

      sim.draw(g);

      return rects.filter((r) => String(r.style).startsWith("rgba(255,255,255")).length;
    };

    sim.step(5.9);
    expect(flashes()).toBe(0);

    sim.step(0.2);
    expect(flashes()).toBe(1);

    sim.step(FLASH_SEC + 0.01);
    expect(flashes()).toBe(0);
  });

  it("дощ і гроза помітні на звичайному зумі: товсті яскраві струмені, багато крапель; гроза темніша за дощ", () => {
    for (const kind of ["rain", "storm"] as const) {
      const effect = WEATHER_EFFECTS[kind];

      const { g, rects } = fillRects();

      effect.create(size, particleCount(size, effect), Math.random).draw(g);

      expect(g.lineWidth).toBeGreaterThanOrEqual(1.5);
      expect(alpha(g.strokeStyle)).toBeGreaterThanOrEqual(0.8);
      expect(particleCount(size, effect)).toBeGreaterThanOrEqual(200);
      expect(rects.some((r) => r.w === size.width && r.h === size.height)).toBe(true);
    }

    const darkness = (kind: "rain" | "storm") => {
      const { g, rects } = fillRects();

      WEATHER_EFFECTS[kind].create(size, 10, Math.random).draw(g);

      return alpha(rects[0].style);
    };

    expect(darkness("storm")).toBeGreaterThan(darkness("rain"));
    // HP під токенами мусить читатися: затемнення шару не густіше за третину
    expect(darkness("storm") * WEATHER_EFFECTS.storm.opacity).toBeLessThan(0.34);
  });

  it("вогонь як пекло: червоно-помаранчевий відтінок на всю карту, густе сяйво знизу, сотні іскор", () => {
    const { g, rects } = fillRects();

    createEmbers(size, particleCount(size, WEATHER_EFFECTS.embers), Math.random).draw(g);

    expect(rects[0]).toMatchObject({ x: 0, y: 0, w: size.width, h: size.height });
    expect(String(rects[0].style)).toMatch(/^rgba\(1\d\d,\s*[1-4]\d,/);

    const glow = rects[1];

    expect(glow.y + glow.h).toBe(size.height);
    expect(glow.h).toBeGreaterThanOrEqual(size.height * 0.6);
    expect(particleCount(size, WEATHER_EFFECTS.embers)).toBeGreaterThanOrEqual(240);
    expect(WEATHER_EFFECTS.embers.tint).toContain("linear-gradient");
  });

  it("дим тримається смуги зверху й повільно дрейфує вбік", () => {
    const sim = createDrift(size, 20, Math.random, { vx: 8, vy: 0, color: "#000", clear: "#0000", minR: 0.2, maxR: 0.3, band: [0, 0.25] });

    sim.step(30);

    const ys: number[] = [];

    const g = recordingContext();

    (g as unknown as { createRadialGradient: (x: number, y: number) => CanvasGradient }).createRadialGradient = (_x, y) => {
      ys.push(y);

      return { addColorStop: () => undefined } as unknown as CanvasGradient;
    };

    sim.draw(g);

    expect(ys).toHaveLength(20);
    expect(Math.max(...ys)).toBeLessThanOrEqual(size.height * 0.25);
  });

  it("гробниця: без зеленого туману — єдиний градієнт кадру це віньєтка на всю рамку, що повільно пульсує", () => {
    const sim = createCrypt(size, particleCount(size, WEATHER_EFFECTS.crypt), Math.random);

    const frame = () => {
      const centers: Array<{ x: number; y: number }> = [];

      const stops: number[][] = [];

      const { g, rects } = fillRects();

      (g as unknown as { createRadialGradient: (x: number, y: number) => CanvasGradient }).createRadialGradient = (x, y) => {
        centers.push({ x, y });

        const own: number[] = [];

        stops.push(own);

        return { addColorStop: (_o: number, c: string) => own.push(alpha(c)) } as unknown as CanvasGradient;
      };

      sim.draw(g);

      return { centers, stops, rects };
    };

    const a = frame();

    const last = a.rects.at(-1);

    expect(last).toMatchObject({ x: 0, y: 0, w: size.width, h: size.height });

    expect(a.centers).toHaveLength(1);
    expect(a.centers[0]).toEqual({ x: size.width / 2, y: size.height / 2 });

    sim.step(2);

    const b = frame();

    expect(Math.max(...(b.stops.at(-1) ?? []))).not.toBeCloseTo(Math.max(...(a.stops.at(-1) ?? [])), 3);
  });

  it("гробниця: чорний сніг летить по діагоналі, вітер поривами", () => {
    const sim = createCrypt(size, 40, fixed(0.5));

    const flake = () => {
      const out: Array<{ x: number; y: number }> = [];

      const g = recordingContext();

      (g as unknown as { arc: (x: number, y: number) => void }).arc = (x, y) => {
        if (g.fillStyle === BLACK_SNOW) out.push({ x, y });
      };

      sim.draw(g);

      return out[0];
    };

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

  it("гробниця: зелені світлячки блукають і блимають з мʼяким сяйвом", () => {
    const sim = createCrypt(size, 40, fixed(0.5));

    const cores: number[] = [];

    const spots: string[] = [];

    for (let i = 0; i < 50; i++) {
      const g = recordingContext();

      const lit: Array<{ x: number; y: number; style: string }> = [];

      (g as unknown as { arc: (x: number, y: number) => void }).arc = (x, y) => lit.push({ x, y, style: String(g.fillStyle) });
      sim.draw(g);

      const fly = lit.filter((l) => l.style.startsWith(`rgba(${FIREFLY_RGB},`));

      // ядро й ореол: два кола на світлячка, ореол прозоріший
      cores.push(fly.length ? alpha(fly[1].style) : 0);

      if (fly.length) {
        expect(alpha(fly[0].style)).toBeLessThan(alpha(fly[1].style));
        spots.push(`${Math.round(fly[1].x)}:${Math.round(fly[1].y)}`);
      }

      sim.step(0.1);
    }

    expect(Math.min(...cores)).toBe(0);
    expect(Math.max(...cores)).toBeGreaterThan(0.6);
    expect(new Set(spots).size).toBeGreaterThan(5);
    expect(fireflyGlow(-Math.PI / 2)).toBe(0);
    expect(fireflyGlow(Math.PI / 2)).toBe(1);
    // без руху — статичне темне нейтральне затінення, не зелений туман
    for (const [, r, g, b] of WEATHER_EFFECTS.crypt.tint.matchAll(/rgba\((\d+),(\d+),(\d+),/g)) expect(Math.max(+r, +g, +b) - Math.min(+r, +g, +b)).toBeLessThanOrEqual(4);
  });
});
