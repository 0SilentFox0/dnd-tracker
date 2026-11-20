export const WORLD_MAPS_BUCKET = 'world-maps';
export const WORLD_MAP_MAX_EDGE_PX = 4096;

export const WORLD_MAP_UPLOAD_QUALITY = 0.8;

// iOS Safari caps a canvas around 16.7 Mpx
export const WORLD_MAP_MAX_PIXELS = 16_000_000;

const MAX_WORLD_MAP_MB = 20;

export const MAX_WORLD_MAP_BYTES = MAX_WORLD_MAP_MB * 1024 * 1024;
export const WORLD_MAP_UPLOAD_TYPES = ['image/webp', 'image/jpeg'] as const;
export const WORLD_MAP_FORMATS = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
} as const;

export const WORLD_NAME_MAX = 80;
export const WORLD_DM_NOTE_MAX = 4000;
export const WORLD_NOTE_MAX = 2000;
export const WORLD_MARKER_DESCRIPTION_MAX = 600;
export const MAX_TRAVEL_HEROES = 20;
export const TRAVEL_LOG_LIMIT = 50;
export const MAX_WORLD_MAPS = 200;
export const WORLD_SESSION_NAME_MAX = WORLD_NAME_MAX;
export const WORLD_SESSION_DESCRIPTION_MAX = 600;
export const MAX_WORLD_SESSIONS = 200;
export const MAX_WORLD_ENEMY_PINS = 200;
export const MAX_WORLD_LAYERS = 20;
export const WORLD_LAYER_OPACITY = { min: 0.05, max: 1 } as const;
export const WORLD_LAYER_COORD = { min: -1, max: 2 } as const;
export const WORLD_LAYER_SIZE = { min: 0.02, max: 2 } as const;
export const TRAIL_ENTRY_LIMIT = 500;
export const HERO_DRAG_THRESHOLD_PX = 6;
export const WORLD_NO_SESSION_COLOR = '#8a8a8a';
export const WORLD_SESSION_COLORS: readonly string[] = [
    '#d3b060',
    '#c0504d',
    '#4f81bd',
    '#9bbb59',
    '#8064a2',
    '#4bacc6',
    '#f79646',
    '#d96fa0',
];
export const MAX_MARKERS_PER_MAP = 300;
export const POLYGON_MAX_VERTICES = 200;
export const WORLD_MAX_ZOOM = 8;
export const ZONE_LABEL_MODES = ['auto', 'hidden', 'always'] as const;
export const LAYER_ZONE_LABELS = ['auto', 'hidden'] as const;
export const WORLD_ZONE_OPACITY_MIN = 0.1;
export const ZONE_FILL_DEFAULT = 0.6;
export const NO_LAYER_KEY = '__none__';
export const DEFAULT_ZONE_COLOR = '#d3b060';
export const DEFAULT_ENEMY_COLOR = '#b91c1c';
export const REVEAL_RADIUS_RANGE = { min: 0.01, max: 0.2 } as const;

export const WORLD_MARKER_ICON_KEYS = [
    'castle',
    'city',
    'village',
    'dungeon',
    'portal',
    'camp',
    'landmark',
    'battle',
] as const;

export const WORLD_MARKER_ICONS = Object.fromEntries(
    WORLD_MARKER_ICON_KEYS.map((k) => [k, true])
) as Record<string, true>;

export const WORLD_LABEL_ZOOM = 2.5;
export const WORLD_ZONE_LABEL_HIDE_ZOOM = 4;
export const WORLD_ZONE_LABEL_CONFLICT = 0.04;
export const WORLD_MINOR_PIN_ZOOM = 1.8;
export const WORLD_LABEL_ZOOM_COMPACT = 4;
export const WORLD_ZONE_LABEL_CONFLICT_COMPACT = 0.14;
export const WORLD_SNAP_PX = 8;
export const PIN_CLUSTER_PX = 28;
export const PIN_CLUSTER_PX_COMPACT = 36;
export const WORLD_DIVE_MS = 600;
export const WORLD_REVEAL_MS = 300;
