import {
    type MAZE_DIFFICULTIES,
    type MAZE_MARK_SYMBOLS,
} from '@/lib/constants/battle';
import type { WEATHER_KINDS } from '@/lib/constants/battle-weather';
import type { FxImpact } from '@/lib/utils/battle/fx';
import type { GridWindow } from '@/lib/utils/battle/grid/layout';
import type { ModeView } from '@/lib/utils/battle/modes/types';
import type { ZoneTrigger } from '@/lib/utils/spells/model/schema';
import type { ActiveEffect } from '@/types/battle';

export interface GridPoint {
    x: number;
    y: number;
}

export type Direction8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type MazeDifficulty = (typeof MAZE_DIFFICULTIES)[number];

export type MazeMarkSymbol = (typeof MAZE_MARK_SYMBOLS)[number];

export interface MazeMark {
    symbol: MazeMarkSymbol;
    color: string;
    by: string;
}

export interface IllusionDisguise {
    name: string;
    avatar?: string;
    unitId?: string;
}

export interface IllusionPair {
    a: string;
    b: string;
    aSees: IllusionDisguise;
    bSees: IllusionDisguise;
}

export interface IllusionGroup {
    heroes: Array<{ id: string; disguise: IllusionDisguise }>;
}

export interface MazeConfig {
    walls: string[];
    exit: GridPoint | null;
    difficulty: MazeDifficulty;
    teleports: [GridPoint, GridPoint][];
    fog: string[];
    marks: Record<string, MazeMark>;
    dark: boolean;
    moved?: boolean;
    illusionSwap?: { pairs?: IllusionPair[]; groups?: IllusionGroup[] };
}

export type TemplateShape =
    | 'circle'
    | 'cube'
    | 'cone'
    | 'line'
    | 'cross'
    | 'emanation';

export interface SpellTemplate {
    shape: TemplateShape;
    size: number;
    hollow?: boolean;
    /** 5e: euclidean disk rather than the legacy square */
    exact?: boolean;
}

export type MapMotionAxis = 'x' | 'y';

export interface MapMotion {
    axis: MapMotionAxis;
    speed: number;
}

export type WeatherKind = (typeof WEATHER_KINDS)[number];

export interface BattleMapConfig {
    cols: number;
    rows: number;
    background: string | null;
    source?: {
        url: string;
        attribution: string;
        license: 'CC-BY-SA-4.0';
    };
    opacity: number;
    blocked?: string[];
    terrain?: Record<string, TerrainCell>;
    spellZones?: Record<string, SpellZoneRuntime>;
    backgroundCols?: number;
    backgroundRows?: number;
    gridOffset?: { x: number; y: number };
    maze?: MazeConfig | null;
    walls?: string[];
    bars?: string[];
    doors?: Record<string, DoorState>;
    weather?: WeatherKind | null;
    motion?: MapMotion | null;
}

export interface DoorState {
    open: boolean;
    locked?: boolean;
}

export type FogMode = 'off' | 'reveal' | 'vision';

export type RevealedRun = readonly [y: number, startX: number, endX: number];

export interface FogState {
    mode: FogMode;
    revealed: RevealedRun[];
    visionRadius: number;
}

export interface BattleMapState {
    removedEdges: string[];
    doors: Record<string, DoorState>;
    fog?: FogState;
}

export interface MapStateDelta {
    removed?: { add: string[]; remove: string[] };
    doors?: Record<string, DoorState | null>;
    fog?: {
        mode?: FogMode;
        visionRadius?: number;
        revealed?: { add: RevealedRun[]; remove: RevealedRun[] };
    };
}

export interface MapBase {
    walls?: string[];
    bars?: string[];
}

export interface BattleMapRef {
    mapId: string;
    version: number;
}

export type TerrainKind = 'wall' | 'barrier' | 'hazard' | 'difficult';

export interface AnchoredZoneState {
    casterId: string;
    spellId: string;
    spellName: string;
    dc?: number;
    radiusFeet: number;
    side: 'enemies' | 'allies' | 'all';
    excludeBearer?: boolean;
    onEnter?: ZoneTrigger;
    onTurnStart?: ZoneTrigger;
    endsWhenStartOutside?: boolean;
    attackBonus?: number;
    dice?: string;
}

export interface PendingHit {
    id: string;
    targetId: string;
    atRound: number;
    amount: number;
    damageType: string;
    spellName: string;
    school: string | null;
}

export interface SpellZoneRuntime {
    casterId: string;
    spellId: string;
    spellName: string;
    dc?: number;
    side: 'enemies' | 'all';
    dice?: string;
    centre?: GridPoint;
    triggers: {
        onEnter?: ZoneTrigger;
        onTurnStart?: ZoneTrigger;
        onExit?: ZoneTrigger;
    };
    untilRound: number;
    concentrationOf?: { casterId: string; castId: string };
}

export interface TerrainDamage {
    dice?: string;
    amount?: number;
    type: string;
    spellId?: string;
    casterId?: string;
    concentrationOf?: { casterId: string; castId: string };
}

export interface TerrainCell {
    kind: TerrainKind;
    label?: string;
    untilRound?: number;
    damage?: TerrainDamage;
    difficult?: true;
    obscured?: true;
    zoneId?: string;
}

export interface TerrainDiff {
    set?: { cell: TerrainCell; keys: string[] }[];
    removed?: string[];
}

export type BattleMapMark =
    | 'move'
    | 'move-danger'
    | 'target'
    | 'invalid-target'
    | 'template'
    | 'pick'
    | 'picked';

export interface BattleMapView {
    camera?: { follow: boolean; selfId: string | null };
    selectedId?: string | null;
    currentId?: string | null;
    marks?: Map<string, BattleMapMark | number>;
    range?: GridWindow | null;
    trajectory?: {
        fromId: string;
        targetId: string;
        to: GridPoint;
        kind: 'melee' | 'ranged';
        cover?: string[];
    } | null;
    aim?: GridPoint | null;
    pulseFrom?: GridPoint | null;
    hud?: Map<string, { exact: boolean }>;
    returnId?: string | null;
    pendingStroke?: ReadonlySet<string>;
    round?: number;
    impactFor?: (participantId: string) => FxImpact | null;
    effects?: ReadonlyMap<string, readonly ActiveEffect[]>;
    mode?: ModeView | null;
}

export interface BattleMapActions {
    onCellClick?: (p: GridPoint) => void;
    onCellHover?: (p: GridPoint | null) => void;
    onTokenClick?: (id: string) => void;
    onStroke?: (cells: GridPoint[]) => void;
    onReturn?: () => void;
}
