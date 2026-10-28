import { z } from "zod";

import {
  MAX_TRAVEL_HEROES,
  MAX_WORLD_MAP_BYTES,
  POLYGON_MAX_VERTICES,
  REVEAL_RADIUS_RANGE,
  WORLD_DM_NOTE_MAX,
  WORLD_MAP_MAX_EDGE_PX,
  WORLD_MAP_UPLOAD_TYPES,
  WORLD_MARKER_ICONS,
  WORLD_NAME_MAX,
  WORLD_NOTE_MAX,
} from "@/lib/constants/world";

const coord = z.number().min(0, "Координата поза межами карти").max(1, "Координата поза межами карти");

const polygonSchema = z
  .array(z.tuple([coord, coord]))
  .min(3, "Зона має мати щонайменше 3 вершини")
  .max(POLYGON_MAX_VERTICES, `Забагато вершин (максимум ${POLYGON_MAX_VERTICES})`)
  .superRefine((poly, ctx) => {
    if (new Set(poly.map(([x, y]) => `${x},${y}`)).size < 3) ctx.addIssue({ code: "custom", message: "Зона має мати щонайменше 3 різні вершини" });
  });

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Колір має бути у форматі #rrggbb");

const nameSchema = z.string().trim().min(1, "Вкажіть назву").max(WORLD_NAME_MAX, `Назва — до ${WORLD_NAME_MAX} символів`);

const imageUrl = z.string().url("Некоректне посилання").max(1000);

const edge = z.number().int().min(1).max(WORLD_MAP_MAX_EDGE_PX);

const iconKeys = Object.keys(WORLD_MARKER_ICONS) as [string, ...string[]];

const iconSchema = z.enum(iconKeys);

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
  .refine((o) => Object.keys(o).length > 0, "Немає полів для оновлення");

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
      ctx.addIssue({ code: "custom", path: ["polygon"], message: "Для зони потрібен контур" });
    }

    if (v.kind === "point" && v.polygon) {
      ctx.addIssue({ code: "custom", path: ["polygon"], message: "Точка не має контуру" });
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
  .refine((o) => Object.keys(o).length > 0, "Немає полів для оновлення");

export const worldUploadRequestSchema = z.object({
  size: z.number().int().min(1).max(MAX_WORLD_MAP_BYTES, "Файл завеликий"),
  contentType: z.enum(WORLD_MAP_UPLOAD_TYPES),
});

export const worldDiscardUploadSchema = z.object({ imageUrl: z.string().url().max(2048) });

const restSchema = z.enum(["none", "short", "long"]);

const characterIds = z
  .array(z.string().min(1))
  .min(1, "Оберіть хоча б одного героя")
  .max(MAX_TRAVEL_HEROES, `Забагато героїв (максимум ${MAX_TRAVEL_HEROES})`)
  .refine((ids) => new Set(ids).size === ids.length, "Герої не мають повторюватися");

export const travelSchema = z.object({
  mapId: z.string().min(1),
  characterIds,
  to: z.object({ x: coord, y: coord }),
  toMarkerId: z.string().min(1).optional(),
  rest: restSchema,
});

export const enterSchema = z.object({ markerId: z.string().min(1), characterIds, rest: restSchema });

export const exitSchema = z.object({ mapId: z.string().min(1), characterIds, rest: restSchema });

const noteText = z.string().trim().min(1, "Нотатка порожня").max(WORLD_NOTE_MAX, `Нотатка — до ${WORLD_NOTE_MAX} символів`);

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
  .refine((o) => Object.keys(o).length > 0, "Немає полів для оновлення");

export const worldViewQuerySchema = z.object({ mapId: z.string().min(1), asHeroId: z.string().min(1).optional() });
