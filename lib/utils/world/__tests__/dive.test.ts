import { describe, expect, it } from "vitest";

import { diveOrigin } from "../dive";

import type { WorldMap, WorldMarker } from "@/types/world";

const map = (over: Partial<WorldMap>) => ({ id: "m1", parentMarkerId: null, parentMapId: null, ...over }) as WorldMap;

const marker = (over: Partial<WorldMarker>) => ({ id: "k1", x: 120, y: 80, ...over }) as WorldMarker;

describe("diveOrigin", () => {
  const prev = { map: map({ id: "m1" }), markers: [marker({})] };

  it("карта-нащадок маркера попередньої — точка маркера", () => {
    expect(diveOrigin(prev, { map: map({ id: "m2", parentMapId: "m1", parentMarkerId: "k1" }) })).toEqual({ x: 120, y: 80 });
  });

  it("маркера нема в попередньому вигляді (туман) — null", () => {
    expect(diveOrigin(prev, { map: map({ id: "m2", parentMapId: "m1", parentMarkerId: "k9" }) })).toBeNull();
  });

  it("вихід на батьківську карту — null", () => {
    expect(diveOrigin({ map: map({ id: "m2", parentMapId: "m1", parentMarkerId: "k1" }), markers: [] }, { map: map({ id: "m1" }) })).toBeNull();
  });

  it("маркер іншої карти — null", () => {
    expect(diveOrigin(prev, { map: map({ id: "m3", parentMapId: "other", parentMarkerId: "k1" }) })).toBeNull();
  });

  it("без попереднього вигляду — null", () => {
    expect(diveOrigin(null, { map: map({ id: "m2", parentMapId: "m1", parentMarkerId: "k1" }) })).toBeNull();
  });
});
