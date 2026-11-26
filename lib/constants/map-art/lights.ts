export const LIGHT_COLORS = [
    { id: 'torch', color: '#ffb347' },
    { id: 'candle', color: '#ffd98a' },
    { id: 'daylight', color: '#fff4d6' },
    { id: 'moon', color: '#b8c8ff' },
    { id: 'magic', color: '#a78bfa' },
    { id: 'fire', color: '#ff6a3d' },
    { id: 'nature', color: '#7ddc8a' },
    { id: 'frost', color: '#8fe3ff' },
] as const;

export const AMBIENT_TINTS = [
    { id: 'none', color: '#000000' },
    { id: 'night', color: '#0b1030' },
    { id: 'dusk', color: '#3a1d4a' },
    { id: 'cave', color: '#1a1410' },
    { id: 'swamp', color: '#10301c' },
    { id: 'blood', color: '#3a0a0a' },
] as const;

export const ART_TOOLS = [
    'floor',
    'floor-fill',
    'floor-erase',
    'room',
    'wall',
    'wall-erase',
    'opening',
    'blocked',
    'light',
] as const;

export const FLOOR_TOOLS: readonly string[] = [
    'floor',
    'floor-fill',
    'floor-erase',
    'room',
];

export const BRUSH_TOOLS: readonly string[] = ['floor', 'floor-erase'];
