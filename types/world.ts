export type MarkerKind = "point" | "zone";
export type MapPoint = { x: number; y: number };
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
  alwaysVisible: boolean;
  sortOrder: number;
  childMapId: string | null;
}

export interface WorldMapDetail {
  map: WorldMap;
  markers: WorldMarker[];
  heroes?: WorldHero[];
}

export type CreateWorldMapData = { name: string; imageUrl: string; width: number; height: number; parentMarkerId?: string };
export type UpdateWorldMapData = Partial<
  Pick<WorldMap, "name" | "imageUrl" | "width" | "height" | "fogEnabled" | "revealRadius" | "entryX" | "entryY">
>;
export type CreateWorldMarkerData = {
  mapId: string;
  kind: MarkerKind;
  x: number;
  y: number;
  polygon?: Polygon;
  name: string;
  icon?: string;
  color?: string;
};
export type UpdateWorldMarkerData = Partial<
  Pick<WorldMarker, "x" | "y" | "polygon" | "name" | "icon" | "color" | "dmNote" | "alwaysVisible" | "sortOrder">
>;
export type WorldUploadRequest = { size: number; contentType: "image/webp" | "image/jpeg" };

export type RevealShape = { t: "p"; x: number; y: number } | { t: "s"; x1: number; y1: number; x2: number; y2: number };
export type TravelRest = "none" | "short" | "long";

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
  visibility: "public" | "private";
  text: string;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Pusher `world-changed`: без назв, координат і нотаток. */
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
  createdAt: string;
}

export type TravelRequest = { mapId: string; characterIds: string[]; to: MapPoint; toMarkerId?: string; rest: TravelRest };
export type EnterRequest = { markerId: string; characterIds: string[]; rest: TravelRest };
export type ExitRequest = { mapId: string; characterIds: string[]; rest: TravelRest };
export type CreateWorldNoteData = { markerId: string; text: string; visibility: "public" | "private"; characterId?: string };
