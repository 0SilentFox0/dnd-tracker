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
