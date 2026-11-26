import type { TileRenderState } from './tiles/TileCanvas';

import type { EdgeEditing, MapDoorsTool, ModeTools } from '@/lib/hooks/battle';
import type { FogBrush } from '@/lib/hooks/battle';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapActions,
    BattleMapConfig,
    BattleMapView,
    GridPoint,
    RevealedRun,
} from '@/types/battle-grid';
import type { MapArtScene } from '@/types/battle-map';

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

export interface ArtPreviewState {
    mapId: string;
    scene: MapArtScene;
    revision: number;
    lights?: {
        selectedId: string | null;
        select(id: string | null): void;
        move(id: string, at: { x: number; y: number }): void;
    };
}

export interface BattleMapEditing {
    art?: ArtPreviewState | null;
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
