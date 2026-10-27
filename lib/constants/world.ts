export const WORLD_MAPS_BUCKET = "world-maps";
export const WORLD_MAP_MAX_EDGE_PX = 6000;
export const MAX_WORLD_MAP_MB = 20;
export const MAX_WORLD_MAP_BYTES = MAX_WORLD_MAP_MB * 1024 * 1024;
export const WORLD_MAP_UPLOAD_TYPES = ["image/webp", "image/jpeg"] as const;
export const WORLD_MAP_FORMATS = { "image/webp": "webp", "image/jpeg": "jpg" } as const;

export const WORLD_NAME_MAX = 80;
export const WORLD_DM_NOTE_MAX = 4000;
export const MAX_WORLD_MAPS = 200;
export const MAX_MARKERS_PER_MAP = 300;
export const POLYGON_MAX_VERTICES = 200;
export const WORLD_MAX_ZOOM = 8;
export const DEFAULT_ZONE_COLOR = "#d3b060";
export const REVEAL_RADIUS_RANGE = { min: 0.01, max: 0.2 } as const;

export const WORLD_MARKER_ICONS: Record<string, { label: string }> = {
  castle: { label: "Замок" },
  city: { label: "Місто" },
  village: { label: "Село" },
  dungeon: { label: "Підземелля" },
  portal: { label: "Портал" },
  camp: { label: "Табір" },
  landmark: { label: "Визначне місце" },
  battle: { label: "Битва" },
};
