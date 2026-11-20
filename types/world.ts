export type LayerVisibility = 'dm' | 'all' | 'heroes';
export interface LayerRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface WorldLayer {
    id: string;
    mapId: string;
    name: string;
    color: string | null;
    visibility: LayerVisibility;
    heroIds: string[];
    sortOrder: number;
    imageUrl: string | null;
    rect: LayerRect;
    opacity: number;
}

export type WorldViewLayer = Pick<
    WorldLayer,
    'id' | 'name' | 'color' | 'imageUrl' | 'rect' | 'opacity'
>;
export type CreateWorldLayerData = {
    mapId: string;
    name: string;
    color?: string;
};
export type UpdateWorldLayerData = Partial<
    Pick<
        WorldLayer,
        | 'name'
        | 'color'
        | 'visibility'
        | 'imageUrl'
        | 'rect'
        | 'opacity'
        | 'sortOrder'
    >
>;
export type DeleteWorldLayerMode = 'ungroup' | 'delete';

export type MarkerKind = 'point' | 'zone';
export type MapPoint = { x: number; y: number };

export interface MapFocus {
    point: MapPoint;
    seq: number;
    zoom?: number;
}
export type Polygon = [number, number][];

export interface WorldMapSummary {
    id: string;
    name: string;
    parentMarkerId: string | null;
    parentMapId: string | null;
    imageUrl: string;
    width: number;
    height: number;
}

export interface WorldMap extends WorldMapSummary {
    fogEnabled: boolean;
    revealRadius: number;
    entryX: number;
    entryY: number;
    updatedAt: string;
}

export interface WorldMarker {
    id: string;
    mapId: string;
    kind: MarkerKind;
    x: number;
    y: number;
    polygon: Polygon | null;
    name: string;
    icon: string | null;
    color: string | null;
    dmNote: string | null;
    description: string | null;
    alwaysVisible: boolean;
    sortOrder: number;
    childMapId: string | null;
    layerId: string | null;
}

export interface WorldMapDetail {
    map: WorldMap;
    markers: WorldMarker[];
    heroes?: WorldHero[];
    notes?: WorldNote[];
    enemies?: WorldEnemyPin[];
    layers?: WorldLayer[];
}

export type CreateWorldMapData = {
    name: string;
    imageUrl: string;
    width: number;
    height: number;
    parentMarkerId?: string;
};
export type UpdateWorldMapData = Partial<
    Pick<
        WorldMap,
        | 'name'
        | 'imageUrl'
        | 'width'
        | 'height'
        | 'fogEnabled'
        | 'revealRadius'
        | 'entryX'
        | 'entryY'
    >
> & { parentMarkerId?: string };
export type CreateWorldMarkerData = {
    mapId: string;
    kind: MarkerKind;
    x: number;
    y: number;
    polygon?: Polygon;
    name: string;
    icon?: string;
    color?: string;
    description?: string;
    layerId?: string | null;
};
export type UpdateWorldMarkerData = Partial<
    Pick<
        WorldMarker,
        | 'x'
        | 'y'
        | 'polygon'
        | 'name'
        | 'icon'
        | 'color'
        | 'dmNote'
        | 'description'
        | 'alwaysVisible'
        | 'sortOrder'
        | 'layerId'
    >
>;
export type WorldUploadRequest = {
    size: number;
    contentType: 'image/webp' | 'image/jpeg';
};

export type RevealShape =
    | { t: 'p'; x: number; y: number }
    | { t: 's'; x1: number; y1: number; x2: number; y2: number };
export type TravelRest = 'none' | 'short' | 'long';

export const TRAVEL_KINDS = ['travel', 'enter', 'exit', 'rest'] as const;
export type TravelKind = (typeof TRAVEL_KINDS)[number];

export const toTravelKind = (kind: string): TravelKind =>
    (TRAVEL_KINDS as readonly string[]).includes(kind)
        ? (kind as TravelKind)
        : 'travel';

export interface WorldHero {
    id: string;
    name: string;
    avatar: string | null;
    mapId: string;
    x: number;
    y: number;
    own: boolean;
}

export interface WorldNote {
    id: string;
    markerId: string;
    authorUserId: string;
    authorName: string;
    characterId: string | null;
    visibility: 'public' | 'private';
    text: string;
    mine: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface WorldChangedEvent {
    campaignId: string;
    mapId: string | null;
    seq: number;
}

export interface WorldView {
    map: WorldMap;
    markers: WorldMarker[];
    heroes: WorldHero[];
    reveals: RevealShape[];
    maps: WorldMapSummary[];
    notes: WorldNote[];
    layers: WorldViewLayer[];
    fog: boolean;
}

export interface HeroPosition {
    characterId: string;
    mapId: string;
    x: number;
    y: number;
}

export interface WorldTravelEntry {
    id: string;
    mapId: string;
    mapName: string;
    heroes: { id: string; name: string }[];
    from: { mapId: string; x: number; y: number } | null;
    to: { mapId: string; x: number; y: number };
    toMarkerName: string | null;
    rest: TravelRest;
    kind: TravelKind;
    createdAt: string;
}

export type TravelRequest = {
    mapId: string;
    characterIds: string[];
    to: MapPoint;
    toMarkerId?: string;
    rest: TravelRest;
};
export type RestRequest = {
    mapId: string;
    characterIds: string[];
    kind: Exclude<TravelRest, 'none'>;
};
export type EnterRequest = {
    markerId: string;
    characterIds: string[];
    rest: TravelRest;
};
export type ExitRequest = {
    mapId: string;
    characterIds: string[];
    rest: TravelRest;
};
export type CreateWorldNoteData = {
    markerId: string;
    text: string;
    visibility: 'public' | 'private';
    characterId?: string;
};

export interface WorldSession {
    id: string;
    name: string;
    description: string | null;
    color: string;
    startedAt: string;
    endedAt: string | null;
    active: boolean;
    entryCount?: number;
}

export type WorldTrailSession = Omit<
    WorldSession,
    'description' | 'active' | 'entryCount'
>;

export interface TrailEntry {
    id: string;
    sessionId: string | null;
    kind: TravelKind;
    heroes: { id: string; name: string }[];
    from: MapPoint | null;
    to: MapPoint;
    at: string;
}

export interface WorldTrailData {
    sessions: WorldTrailSession[];
    entries: TrailEntry[];
}

export interface WorldEnemyPin {
    id: string;
    mapId: string;
    name: string;
    icon: string | null;
    color: string | null;
    dmNote: string | null;
    x: number;
    y: number;
}

export type CreateEnemyData = {
    name: string;
    x: number;
    y: number;
    icon?: string;
    color?: string;
    dmNote?: string;
};
export type UpdateEnemyData = Partial<CreateEnemyData>;
export type CreateSessionData = {
    name: string;
    description?: string;
    color?: string;
};
export type UpdateSessionData = Partial<CreateSessionData> & { end?: true };
