import { describe, expect, it } from "vitest";

import { clusterHeroes } from "../hero-clusters";

import type { WorldHero } from "@/types/world";

const hero = (id: string, x: number, y: number, own = false): WorldHero => ({ id, name: id, avatar: null, mapId: "m", x, y, own });

const px = (box: { width: number; height: number }, zoom = 1) => (h: WorldHero) => ({ x: h.x * box.width * zoom, y: h.y * box.height * zoom });

describe("clusterHeroes", () => {
  it("groups three heroes on one point into one cluster", () => {
    const out = clusterHeroes([hero("a", 0.5, 0.5), hero("b", 0.5, 0.5), hero("c", 0.5, 0.5)], px({ width: 800, height: 600 }), 24);

    expect(out).toHaveLength(1);
    expect(out[0].heroes.map((h) => h.id)).toEqual(["a", "b", "c"]);
  });

  it("splits at the threshold: just under joins, exactly at it separates", () => {
    const box = { width: 1000, height: 1000 };

    expect(clusterHeroes([hero("a", 0, 0), hero("b", 0.0239, 0)], px(box), 24)).toHaveLength(1);
    expect(clusterHeroes([hero("a", 0, 0), hero("b", 0.024, 0)], px(box), 24)).toHaveLength(2);
  });

  it("separates the same heroes after zooming in", () => {
    const heroes = [hero("a", 0.5, 0.5), hero("b", 0.51, 0.5), hero("c", 0.5, 0.51)];

    const box = { width: 1000, height: 1000 };

    expect(clusterHeroes(heroes, px(box, 1), 24)).toHaveLength(1);
    expect(clusterHeroes(heroes, px(box, 3), 24)).toHaveLength(3);
  });

  it("measures distance in screen pixels on a 3:1 map", () => {
    const heroes = [hero("a", 0.5, 0.5), hero("b", 0.5, 0.53)];

    expect(clusterHeroes(heroes, px({ width: 900, height: 300 }), 24)).toHaveLength(1);
    expect(clusterHeroes(heroes, px({ width: 300, height: 900 }), 24)).toHaveLength(2);
  });

  it("puts own heroes first and anchors the cluster at the first one", () => {
    const out = clusterHeroes([hero("a", 0.5, 0.5), hero("b", 0.5, 0.5, true)], px({ width: 800, height: 600 }), 24);

    expect(out[0].heroes.map((h) => h.id)).toEqual(["b", "a"]);
    expect(out[0].key).toBe("b");
  });

  it("is greedy in input order: a far third hero does not chain through the second", () => {
    const out = clusterHeroes([hero("a", 0, 0), hero("b", 0.02, 0), hero("c", 0.04, 0)], px({ width: 1000, height: 1000 }), 24);

    expect(out.map((c) => c.heroes.map((h) => h.id))).toEqual([["a", "b"], ["c"]]);
  });

  it("returns nothing for no heroes", () => {
    expect(clusterHeroes([], px({ width: 1, height: 1 }), 24)).toEqual([]);
  });
});
