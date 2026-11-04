import { describe, expect, it } from "vitest";

import { mergePartyViews, sanitizeDmDetail } from "../party-view";

import type { WorldMap, WorldMarker, WorldView } from "@/types/world";

const map = { id: "m", fogEnabled: true, revealRadius: 0.1, width: 100, height: 100 } as WorldMap;

const mk = (id: string, over: Partial<WorldMarker> = {}) => ({ id, mapId: "m", x: 0.5, y: 0.5, name: id, dmNote: "SECRET", alwaysVisible: false, ...over }) as WorldMarker;

describe("sanitizeDmDetail", () => {
  it("під туманом лишає лише alwaysVisible, без dmNote і героїв", () => {
    const p = sanitizeDmDetail({ map, markers: [mk("a"), mk("b", { alwaysVisible: true })], heroes: [{ id: "h" } as never], notes: [{ id: "n" } as never] });

    expect(p.detail.markers.map((m) => m.id)).toEqual(["b"]);
    expect(p.detail.markers[0].dmNote).toBeNull();
    expect(p.detail.notes).toBeUndefined();
    expect(p.heroes).toEqual([]);
    expect(p.fog).toBeDefined();
  });

  it("без туману всі маркери, але без dmNote", () => {
    const p = sanitizeDmDetail({ map: { ...map, fogEnabled: false }, markers: [mk("a")] });

    expect(p.detail.markers).toHaveLength(1);
    expect(p.detail.markers[0].dmNote).toBeNull();
    expect(p.fog).toBeUndefined();
  });
});

describe("mergePartyViews", () => {
  const v = (markers: WorldMarker[], reveals: WorldView["reveals"]) => ({ map, markers, heroes: [{ id: "h1", own: true }], reveals, maps: [], notes: [{ id: "n" }], fog: true }) as unknown as WorldView;

  it("обʼєднує маркери та розкриття, прибирає нотатки й own", () => {
    const p = mergePartyViews([v([mk("a")], [{ t: "p", x: 0.1, y: 0.1 }]), v([mk("b")], [{ t: "p", x: 0.9, y: 0.9 }])]);

    expect(p.detail.markers.map((m) => m.id).sort()).toEqual(["a", "b"]);
    expect(p.fog?.shapes).toHaveLength(2);
    expect(p.heroes).toHaveLength(1);
    expect(p.heroes[0].own).toBe(false);
    expect(p.detail.notes).toBeUndefined();
    expect(p.detail.markers.every((m) => m.dmNote === null)).toBe(true);
  });
});
