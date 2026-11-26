import {
    Brush,
    DoorOpen,
    Eraser,
    Grid2X2,
    Image as ImageIcon,
    Minus,
    Package,
    PaintBucket,
    Palette,
    Pipette,
    Square,
} from 'lucide-react';

import type { EditorPanel } from '@/lib/hooks/battle-maps';

const PANELS: EditorPanel[] = ['background', 'cells', 'edges', 'art', 'objects'];

const ART_PANELS: EditorPanel[] = ['cells', 'art', 'objects'];

export function panelsFor({
    hex,
    artActive,
}: {
    hex: boolean;
    artActive: boolean;
}): EditorPanel[] {
    const all = artActive ? ART_PANELS : PANELS;

    return hex ? all.filter((p) => p !== 'objects') : all;
}

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
    art: Palette,
    objects: Package,
} satisfies Record<EditorPanel, typeof ImageIcon>;
