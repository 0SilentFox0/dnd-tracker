import { z } from "zod";

import {
  MAX_TRAVEL_HEROES,
  MAX_WORLD_MAP_BYTES,
  POLYGON_MAX_VERTICES,
  REVEAL_RADIUS_RANGE,
  WORLD_DM_NOTE_MAX,
  WORLD_MAP_MAX_EDGE_PX,
  WORLD_MAP_UPLOAD_TYPES,
  WORLD_MARKER_ICON_KEYS,
  WORLD_NAME_MAX,
  WORLD_NOTE_MAX,
} from "@/lib/constants/world";

const coord = z.number().min(0, "world.validation.coordinateOutOfBounds").max(1, "world.validation.coordinateOutOfBounds");

const polygonSchema = z
  .array(z.tuple([coord, coord]))
  .min(3, "world.validation.polygonMin")
  .max(POLYGON_MAX_VERTICES, "world.validation.polygonMax")
  .superRefine((poly, ctx) => {
    if (new Set(poly.map(([x, y]) => `${x},${y}`)).size < 3) ctx.addIssue({ code: "custom", message: "world.validation.polygonDistinct" });
  });

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "world.validation.color");

const nameSchema = z.string().trim().min(1, "world.validation.nameRequired").max(WORLD_NAME_MAX, "world.validation.nameMax");

const imageUrl = z.string().url("world.validation.urlInvalid").max(1000);

const edge = z.number().int().min(1).max(WORLD_MAP_MAX_EDGE_PX);

const iconSchema = z.enum(WORLD_MARKER_ICON_KEYS);

export const createWorldMapSchema = z.object({
  name: nameSchema,
  imageUrl,
  width: edge,
  height: edge,
  parentMarkerId: z.string().min(1).optional(),
});

export const updateWorldMapSchema = z
  .object({
    name: nameSchema,
    imageUrl,
    width: edge,
    height: edge,
    fogEnabled: z.boolean(),
    revealRadius: z.number().min(REVEAL_RADIUS_RANGE.min).max(REVEAL_RADIUS_RANGE.max),
    entryX: coord,
    entryY: coord,
  })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, "world.validation.nothingToUpdate");

export const createWorldMarkerSchema = z
  .object({
    mapId: z.string().min(1),
    kind: z.enum(["point", "zone"]),
    x: coord,
    y: coord,
    polygon: polygonSchema.optional(),
    name: nameSchema,
    icon: iconSchema.optional(),
    color: hexColor.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "zone" && !v.polygon) {
      ctx.addIssue({ code: "custom", path: ["polygon"], message: "world.validation.zoneNeedsPolygon" });
    }

    if (v.kind === "point" && v.polygon) {
      ctx.addIssue({ code: "custom", path: ["polygon"], message: "world.validation.pointNoPolygon" });
    }
  });

export const updateWorldMarkerSchema = z
  .object({
    x: coord,
    y: coord,
    polygon: polygonSchema.nullable(),
    name: nameSchema,
    icon: iconSchema.nullable(),
    color: hexColor.nullable(),
    dmNote: z.string().max(WORLD_DM_NOTE_MAX).nullable(),
    alwaysVisible: z.boolean(),
    sortOrder: z.number().int().min(0),
  })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, "world.validation.nothingToUpdate");

export const worldUploadRequestSchema = z.object({
  size: z.number().int().min(1).max(MAX_WORLD_MAP_BYTES, "world.validation.fileTooLarge"),
  contentType: z.enum(WORLD_MAP_UPLOAD_TYPES),
});

export const worldDiscardUploadSchema = z.object({ imageUrl: z.string().url().max(2048) });

const restSchema = z.enum(["none", "short", "long"]);

const characterIds = z
  .array(z.string().min(1))
  .min(1, "world.validation.heroesRequired")
  .max(MAX_TRAVEL_HEROES, "world.validation.heroesMax")
  .refine((ids) => new Set(ids).size === ids.length, "world.validation.heroesUnique");

export const travelSchema = z.object({
  mapId: z.string().min(1),
  characterIds,
  to: z.object({ x: coord, y: coord }),
  toMarkerId: z.string().min(1).optional(),
  rest: restSchema,
});

export const enterSchema = z.object({ markerId: z.string().min(1), characterIds, rest: restSchema });

export const exitSchema = z.object({ mapId: z.string().min(1), characterIds, rest: restSchema });

export const restWorldSchema = z.object({ mapId: z.string().min(1), characterIds, kind: z.enum(["short", "long"]) });

const noteText = z.string().trim().min(1, "world.validation.noteEmpty").max(WORLD_NOTE_MAX, "world.validation.noteMax");

const noteVisibility = z.enum(["public", "private"]);

export const createWorldNoteSchema = z.object({
  markerId: z.string().min(1),
  text: noteText,
  visibility: noteVisibility,
  characterId: z.string().min(1).optional(),
});

export const updateWorldNoteSchema = z
  .object({ text: noteText, visibility: noteVisibility })
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, "world.validation.nothingToUpdate");

export const worldViewQuerySchema = z.object({ mapId: z.string().min(1), asHeroId: z.string().min(1).optional() });
