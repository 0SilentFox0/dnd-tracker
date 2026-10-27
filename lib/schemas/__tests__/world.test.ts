import { describe, expect, it } from "vitest";

import { MAX_WORLD_MAP_BYTES } from "@/lib/constants/world";
import {
  createWorldMapSchema,
  createWorldMarkerSchema,
  updateWorldMapSchema,
  updateWorldMarkerSchema,
  worldUploadRequestSchema,
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
