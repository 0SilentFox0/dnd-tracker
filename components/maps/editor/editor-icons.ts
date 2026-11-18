import {
    Biohazard,
    BrickWall,
    Brush,
    CloudLightning,
    Coins,
    DoorOpen,
    Droplets,
    Eraser,
    Flame,
    Grid2X2,
    HeartPulse,
    Image as ImageIcon,
    Layers,
    Leaf,
    Minus,
    Package,
    PaintBucket,
    Pipette,
    Snowflake,
    Sparkles,
    Square,
    Sun,
    Wind,
    Zap,
} from 'lucide-react';

import type { MapSpellEffect } from '@/lib/constants/tilesets/types';
import type { EditorPanel } from '@/lib/hooks/battle-maps';

export const PANELS: EditorPanel[] = [
    'background',
    'cells',
    'edges',
    'tiles',
    'effects',
];

export const TILE_TOOLS = [
    { key: 'brush', icon: Brush },
    { key: 'line', icon: Minus },
    { key: 'rectangle', icon: Square },
    { key: 'fill', icon: PaintBucket },
    { key: 'eraser', icon: Eraser },
    { key: 'picker', icon: Pipette },
] as const;

export const EFFECT_ICONS = {
    frost: Snowflake,
    fire: Flame,
    plague: Biohazard,
    blood: Droplets,
    stun: Zap,
    nature: Leaf,
    curse: Wind,
    storm: CloudLightning,
    gold: Coins,
    holy: Sun,
    life: HeartPulse,
} satisfies Record<MapSpellEffect, typeof ImageIcon>;

export const PANEL_ICONS = {
    background: ImageIcon,
    cells: Grid2X2,
    edges: DoorOpen,
    tiles: Layers,
    effects: Sparkles,
} satisfies Record<EditorPanel, typeof ImageIcon>;

export const LAYER_ICONS = {
    ground: Grid2X2,
    wallfill: BrickWall,
    objects: Package,
    'edge-art': DoorOpen,
    effects: Sparkles,
};
