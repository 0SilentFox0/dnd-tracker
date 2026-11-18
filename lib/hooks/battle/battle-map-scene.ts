import type { ModeTools } from './modes/tools';
import type { MapBackgroundTool } from './useMapBackgroundTool';
import type { MapDoorsTool } from './useMapDoors';
import type { useMapFogTool } from './useMapFogTool';
import type { MapMotionTool } from './useMapMotionTool';
import type { MapTerrainTool } from './useMapTerrainTool';
import type { MapUpdateTool } from './useMapUpdateTool';
import type { MapWeatherTool } from './useMapWeatherTool';

import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import type { Viewer } from '@/lib/utils/battle/view/visibility';
import type { BattleScene } from '@/types/api';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapActions,
    BattleMapConfig,
    BattleMapView,
} from '@/types/battle-grid';

export interface BattleMapScene {
    battle: BattleScene;
    viewer: Viewer;
    tileChunks?: TileLayerChunks;
    tileVersion?: number;
    map: BattleMapConfig;
    participants: BattleParticipant[];
    view: BattleMapView;
    followTurn: { on: boolean; toggle(): void } | null;
    actions: BattleMapActions;
    placement: { active: boolean; toggle(): void } | null;
    terrainTool: MapTerrainTool | null;
    fogTool: ReturnType<typeof useMapFogTool>;
    modeTools: ModeTools | null;
    weatherTool: MapWeatherTool | null;
    motionTool: MapMotionTool | null;
    backgroundTool: MapBackgroundTool | null;
    mapUpdate: MapUpdateTool | null;
    doors: MapDoorsTool;
    edgesLinked: boolean;
}
