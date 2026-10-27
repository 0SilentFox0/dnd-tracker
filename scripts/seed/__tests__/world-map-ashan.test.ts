import { describe, expect, it } from "vitest";

import { ASHAN_CITIES, ASHAN_KINGDOMS, ASHAN_SIZE, cropPixels, targetSize } from "../world-map-ashan";

import { WORLD_MARKER_ICONS } from "@/lib/constants/world";
import { createWorldMarkerSchema } from "@/lib/schemas/world";
import { closePolygon } from "@/lib/utils/world/geometry";
import type { Polygon } from "@/types/world";

const NAMES = ["Holy Griffin Empire", "Irollan", "Grimheim", "Silver Cities", "Heresh", "Ranaar", "Ygg-Chall", "Twilight Archipelago"];

function inside(polygon: Polygon, x: number, y: number) {
  let result = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];

    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }

  return result;
}

const unit = (v: number) => v >= 0 && v <= 1;

describe("Ashan seed data", () => {
  it("has the 8 kingdoms from the spec", () => {
    expect(ASHAN_KINGDOMS.map((k) => k.name).sort()).toEqual([...NAMES].sort());
  });

  it.each(ASHAN_KINGDOMS)("$name: valid zone polygon, crop and cities", (k) => {
    const marker = createWorldMarkerSchema.safeParse({ mapId: "m", kind: "zone", x: 0.5, y: 0.5, polygon: k.polygon, name: k.name, color: k.color });

    expect(marker.success).toBe(true);
    expect(closePolygon(k.polygon.slice(0, -1).map(([x, y]) => ({ x, y })))).not.toBeNull();
    expect(k.polygon.flat().every(unit)).toBe(true);
    expect(Object.values(k.crop).every(unit)).toBe(true);
    expect(k.crop.left + k.crop.width).toBeLessThanOrEqual(1);
    expect(k.crop.top + k.crop.height).toBeLessThanOrEqual(1);
    expect(k.cities.length).toBeGreaterThan(0);

    for (const c of k.cities) {
      expect(unit(c.x) && unit(c.y)).toBe(true);
      expect(c.icon in WORLD_MARKER_ICONS).toBe(true);
    }
  });

  it("places every root city inside its own kingdom", () => {
    for (const city of ASHAN_CITIES) {
      const k = ASHAN_KINGDOMS.find((x) => x.name === city.kingdom);

      expect(k, city.name).toBeDefined();
      expect(inside(k?.polygon ?? [], city.x, city.y), city.name).toBe(true);
      expect(city.icon in WORLD_MARKER_ICONS).toBe(true);
    }
  });

  it("has the seven root cities and each is shown in its kingdom's nested map", () => {
    expect(ASHAN_CITIES.map((c) => c.name).sort()).toEqual(["Al Safir", "Karthal", "Nar-Ankar", "Stonehelm", "Syrris Thalla", "Talonguard", "Tor Myrdal"]);

    for (const city of ASHAN_CITIES) {
      expect(ASHAN_KINGDOMS.find((k) => k.name === city.kingdom)?.cities.map((c) => c.name)).toContain(city.name);
    }
  });

  it("converts crops to pixels within the source and caps the output edge", () => {
    for (const k of ASHAN_KINGDOMS) {
      const px = cropPixels(k.crop);

      expect(px.left + px.width).toBeLessThanOrEqual(ASHAN_SIZE.width);
      expect(px.top + px.height).toBeLessThanOrEqual(ASHAN_SIZE.height);

      const out = targetSize(px);

      expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(6000);
    }
  });
});
