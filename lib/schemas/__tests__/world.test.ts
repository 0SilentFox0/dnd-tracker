import { describe, expect, it } from "vitest";

import { MAX_WORLD_MAP_BYTES } from "@/lib/constants/world";
import {
  createWorldMapSchema,
  createWorldMarkerSchema,
  createWorldNoteSchema,
  enterSchema,
  exitSchema,
  travelSchema,
  updateWorldMapSchema,
  updateWorldMarkerSchema,
  updateWorldNoteSchema,
  worldUploadRequestSchema,
  worldViewQuerySchema,
} from "@/lib/schemas/world";

const tri = [
  [0.1, 0.1],
  [0.5, 0.1],
  [0.3, 0.4],
];

describe("createWorldMarkerSchema", () => {
  const base = { mapId: "m1", name: "Ашан" };

  it("accepts a point and a zone", () => {
    expect(createWorldMarkerSchema.safeParse({ ...base, kind: "point", x: 0.2, y: 0.3, icon: "castle" }).success).toBe(true);
    expect(createWorldMarkerSchema.safeParse({ ...base, kind: "zone", x: 0.3, y: 0.2, polygon: tri, color: "#aabbcc" }).success).toBe(true);
  });

  it("rejects a zone without polygon", () => {
    expect(createWorldMarkerSchema.safeParse({ ...base, kind: "zone", x: 0.3, y: 0.2 }).success).toBe(false);
  });

  it("rejects a point with polygon", () => {
    expect(createWorldMarkerSchema.safeParse({ ...base, kind: "point", x: 0.3, y: 0.2, polygon: tri }).success).toBe(false);
  });

  it("rejects polygon with 2 vertices", () => {
    expect(createWorldMarkerSchema.safeParse({ ...base, kind: "zone", x: 0.3, y: 0.2, polygon: tri.slice(0, 2) }).success).toBe(false);
  });

  it("rejects coordinate above 1", () => {
    expect(createWorldMarkerSchema.safeParse({ ...base, kind: "point", x: 1.01, y: 0.2 }).success).toBe(false);
  });

  it("rejects a non-hex color", () => {
    expect(createWorldMarkerSchema.safeParse({ ...base, kind: "point", x: 0.1, y: 0.2, color: "red" }).success).toBe(false);
  });
});

describe("updateWorldMarkerSchema", () => {
  it("accepts a partial update", () => {
    expect(updateWorldMarkerSchema.safeParse({ alwaysVisible: true }).success).toBe(true);
  });
});

describe("world map schemas", () => {
  it("accepts a valid map", () => {
    expect(createWorldMapSchema.safeParse({ name: "Ашан", imageUrl: "https://x.test/a.webp", width: 4000, height: 3000 }).success).toBe(true);
  });

  it("rejects an empty map update", () => {
    expect(updateWorldMapSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a non-empty map update", () => {
    expect(updateWorldMapSchema.safeParse({ fogEnabled: false }).success).toBe(true);
  });

  it("rejects an oversized upload", () => {
    expect(worldUploadRequestSchema.safeParse({ size: 21 * 1024 * 1024, contentType: "image/webp" }).success).toBe(false);
    expect(worldUploadRequestSchema.safeParse({ size: MAX_WORLD_MAP_BYTES, contentType: "image/webp" }).success).toBe(true);
  });
});

describe("travel schemas", () => {
  const base = { mapId: "m1", characterIds: ["a", "b"], to: { x: 0.2, y: 0.3 }, rest: "none" };

  it("accepts a valid travel", () => {
    expect(travelSchema.safeParse(base).success).toBe(true);
    expect(travelSchema.safeParse({ ...base, toMarkerId: "k1", rest: "long" }).success).toBe(true);
  });

  it("rejects duplicate or empty hero ids", () => {
    expect(travelSchema.safeParse({ ...base, characterIds: ["a", "a"] }).success).toBe(false);
    expect(travelSchema.safeParse({ ...base, characterIds: [] }).success).toBe(false);
  });

  it("rejects more than 20 heroes", () => {
    const ids = Array.from({ length: 21 }, (_, i) => `h${i}`);

    expect(travelSchema.safeParse({ ...base, characterIds: ids }).success).toBe(false);
  });

  it("rejects an unknown rest and an out-of-range point", () => {
    expect(travelSchema.safeParse({ ...base, rest: "nap" }).success).toBe(false);
    expect(travelSchema.safeParse({ ...base, to: { x: 1.2, y: 0 } }).success).toBe(false);
  });

  it("validates enter and exit", () => {
    expect(enterSchema.safeParse({ markerId: "k", characterIds: ["a"], rest: "short" }).success).toBe(true);
    expect(enterSchema.safeParse({ markerId: "k", characterIds: ["a", "a"], rest: "short" }).success).toBe(false);
    expect(exitSchema.safeParse({ mapId: "m", characterIds: ["a"], rest: "x" }).success).toBe(false);
  });
});

describe("note and view schemas", () => {
  it("trims text and rejects empty or oversized", () => {
    const ok = createWorldNoteSchema.safeParse({ markerId: "k", text: "  hi  ", visibility: "public" });

    expect(ok.success && ok.data.text).toBe("hi");
    expect(createWorldNoteSchema.safeParse({ markerId: "k", text: "   ", visibility: "public" }).success).toBe(false);
    expect(createWorldNoteSchema.safeParse({ markerId: "k", text: "x".repeat(2001), visibility: "public" }).success).toBe(false);
    expect(createWorldNoteSchema.safeParse({ markerId: "k", text: "a", visibility: "secret" }).success).toBe(false);
  });

  it("update requires at least one field and rejects unknown keys", () => {
    expect(updateWorldNoteSchema.safeParse({}).success).toBe(false);
    expect(updateWorldNoteSchema.safeParse({ visibility: "private" }).success).toBe(true);
    expect(updateWorldNoteSchema.safeParse({ text: "a", markerId: "k" }).success).toBe(false);
  });

  it("view query needs mapId", () => {
    expect(worldViewQuerySchema.safeParse({}).success).toBe(false);
    expect(worldViewQuerySchema.safeParse({ mapId: "m", asHeroId: "h" }).success).toBe(true);
  });
});
