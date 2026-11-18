import type { TileRenderState } from './tiles/TileCanvas';

import type {
    EdgeEditing,
    MapDoorsTool,
    ModeTools,
} from '@/lib/hooks/battle';
import type { FogBrush } from '@/lib/hooks/battle/useMapFogTool';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapActions,
    BattleMapConfig,
    BattleMapView,
    GridPoint,
    RevealedRun,
} from '@/types/battle-grid';

export interface BattleMapProps {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    view?: BattleMapView;
    actions?: BattleMapActions;
    look?: BattleMapLook;
    editing?: BattleMapEditing;
    phone?: boolean;
}

export interface BattleMapLook {
    tiles?: TileRenderState;
    className?: string;
}

export interface BattleMapEditing {
    /** false: no fallback image when the map has no selected background */
    showDefaultBackground?: boolean;
    clickableBlocked?: boolean;
    showBlocked?: boolean;
    strokeTool?: boolean;
    edges?: EdgeEditing | null;
    doors?: MapDoorsTool | null;
    doorLocks?: boolean;
    mode?: ModeTools | null;
    fog?: {
        mode: 'off' | 'reveal' | 'vision';
        revealed: RevealedRun[];
        visible: ReadonlySet<string>;
        explored: ReadonlySet<string>;
        dmEditing: boolean;
        active: boolean;
        brush: FogBrush;
        onStroke(cells: GridPoint[]): void;
    };
}
