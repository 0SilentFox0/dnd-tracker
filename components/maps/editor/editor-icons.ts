import {
    Brush,
    DoorOpen,
    Eraser,
    Grid2X2,
    Image as ImageIcon,
    Minus,
    Package,
    PaintBucket,
    Pipette,
    Square,
} from 'lucide-react';

import type { EditorPanel } from '@/lib/hooks/battle-maps';

export const PANELS: EditorPanel[] = [
    'background',
    'cells',
    'edges',
    'objects',
];

export const TILE_TOOLS = [
    { key: 'brush', icon: Brush },
    { key: 'line', icon: Minus },
    { key: 'rectangle', icon: Square },
    { key: 'fill', icon: PaintBucket },
    { key: 'eraser', icon: Eraser },
    { key: 'picker', icon: Pipette },
] as const;

export const PANEL_ICONS = {
    background: ImageIcon,
    cells: Grid2X2,
    edges: DoorOpen,
    objects: Package,
} satisfies Record<EditorPanel, typeof ImageIcon>;
