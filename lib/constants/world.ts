export const WORLD_MAPS_BUCKET = "world-maps";
export const WORLD_MAP_MAX_EDGE_PX = 6000;

// iOS Safari caps a canvas around 16.7 Mpx
export const WORLD_MAP_MAX_PIXELS = 16_000_000;

const MAX_WORLD_MAP_MB = 20;

export const MAX_WORLD_MAP_BYTES = MAX_WORLD_MAP_MB * 1024 * 1024;
export const WORLD_MAP_UPLOAD_TYPES = ["image/webp", "image/jpeg"] as const;
export const WORLD_MAP_FORMATS = { "image/webp": "webp", "image/jpeg": "jpg" } as const;

export const WORLD_NAME_MAX = 80;
export const WORLD_DM_NOTE_MAX = 4000;
export const WORLD_NOTE_MAX = 2000;
export const MAX_TRAVEL_HEROES = 20;
export const TRAVEL_LOG_LIMIT = 50;
export const MAX_WORLD_MAPS = 200;
export const MAX_MARKERS_PER_MAP = 300;
export const POLYGON_MAX_VERTICES = 200;
export const WORLD_MAX_ZOOM = 8;
export const DEFAULT_ZONE_COLOR = "#d3b060";
export const REVEAL_RADIUS_RANGE = { min: 0.01, max: 0.2 } as const;

export const WORLD_MARKER_ICON_KEYS = ["castle", "city", "village", "dungeon", "portal", "camp", "landmark", "battle"] as const;

export const WORLD_MARKER_ICONS = Object.fromEntries(WORLD_MARKER_ICON_KEYS.map((k) => [k, true])) as Record<string, true>;

export const WORLD_LABEL_ZOOM = 2.5;
export const WORLD_ZONE_LABEL_HIDE_ZOOM = 4;
export const WORLD_ZONE_LABEL_CONFLICT = 0.06;
export const WORLD_LABEL_ZOOM_COMPACT = 4;
export const WORLD_ZONE_LABEL_CONFLICT_COMPACT = 0.14;
export const WORLD_DIVE_MS = 600;
export const WORLD_REVEAL_MS = 300;
