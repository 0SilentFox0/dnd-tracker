import type { PointerEvent, RefObject } from 'react';

import type { TileRenderState } from './tiles/TileCanvas';

import type { EdgeEditing, MapDoorsTool, ModeTools } from '@/lib/hooks/battle';
import type { GridWindow } from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapActions,
    BattleMapConfig,
    BattleMapView,
    RevealedRun,
} from '@/types/battle-grid';

export interface MapStageLayout {
    win: { x: number; y: number };
    size: { width: number; height: number };
    pxPerUnit: number;
    rotated: boolean;
    phone: boolean;
    window: GridWindow | null;
    tiles?: TileRenderState;
}

export interface MapStageInteraction {
    painting: boolean;
    preview: ReadonlySet<string>;
    svgRef: RefObject<SVGSVGElement | null>;
    onStrokeStart: (p: { x: number; y: number }, e: PointerEvent) => void;
    wasDragged: () => boolean;
}

export interface MapStageEditing {
    showDefaultBackground?: boolean;
    clickableBlocked?: boolean;
    showBlocked?: boolean;
    mode: ModeTools | null;
    edges?: EdgeEditing | null;
    doors?: MapDoorsTool | null;
    doorLocks?: boolean;
    fogActive?: boolean;
    fog?: {
        mode: 'off' | 'reveal' | 'vision';
        revealed: RevealedRun[];
        visible: ReadonlySet<string>;
        explored: ReadonlySet<string>;
        dmEditing: boolean;
    };
}

export interface MapStageProps {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    view?: BattleMapView;
    actions?: BattleMapActions;
    editing: MapStageEditing;
    layout: MapStageLayout;
    interaction: MapStageInteraction;
}
