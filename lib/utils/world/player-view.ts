import { isRevealed, zoneTouchesReveal } from './geometry';
import { mapPath } from './tree';

import type {
    HeroPosition,
    LayerRect,
    LayerVisibility,
    LayerZoneLabels,
    MapPoint,
    RevealShape,
    WorldHero,
    WorldMap,
    WorldMapSummary,
    WorldMarker,
    WorldNote,
    WorldView,
    WorldViewLayer,
} from '@/types/world';

export type NoteRow = Omit<WorldNote, 'mine'>;

export type HeroInfo = {
    name: string;
    avatar: string | null;
    controlledBy: string;
};

export interface LayerInput {
    id: string;
    name: string;
    color: string | null;
    visibility: LayerVisibility;
    heroIds: string[];
    imageUrl: string | null;
    rect: LayerRect;
    opacity: number;
    icon: string | null;
    zoneOpacity: number | null;
    zoneLabels: LayerZoneLabels;
}

export const layerVisibleTo = (
    layer: Pick<LayerInput, 'visibility' | 'heroIds'>,
    heroIds: string[]
): boolean =>
    layer.visibility === 'all' ||
    (layer.visibility === 'heroes' &&
        layer.heroIds.some((id) => heroIds.includes(id)));

export interface WorldViewInput {
    map: WorldMap;
    markers: WorldMarker[];
    layers: LayerInput[];
    allMaps: WorldMapSummary[];
    positions: HeroPosition[];
    heroNames: Map<string, HeroInfo>;
    reveals: { mapId: string; characterId: string; shape: RevealShape }[];
    notes: NoteRow[];
    viewer: {
        userId: string;
        heroIds: string[];
        asHero?: boolean;
        isDemo?: boolean;
    };
}

type MarkerVisibilityInput = Pick<
    WorldViewInput,
    'map' | 'markers' | 'layers' | 'reveals' | 'viewer'
>;

function pointOnMap(
    pos: HeroPosition,
    mapId: string,
    byId: Map<string, WorldMapSummary>,
    markers: WorldMarker[],
    layerOk: (m: WorldMarker) => boolean
): MapPoint | null {
    if (pos.mapId === mapId) return { x: pos.x, y: pos.y };

    const seen = new Set<string>();

    for (
        let cur = byId.get(pos.mapId);
        cur && !seen.has(cur.id);
        cur = cur.parentMapId ? byId.get(cur.parentMapId) : undefined
    ) {
        seen.add(cur.id);

        if (cur.parentMapId === mapId) {
            const entry = markers.find((m) => m.id === cur.parentMarkerId);

            return entry && layerOk(entry) ? { x: entry.x, y: entry.y } : null;
        }
    }

    return null;
}

function visibility(input: MarkerVisibilityInput) {
    const { map, viewer } = input;

    const own = new Set(viewer.heroIds);

    const fog = map.fogEnabled;

    const aspect = map.width / map.height;

    const shapes = fog
        ? input.reveals
              .filter((r) => r.mapId === map.id && own.has(r.characterId))
              .map((r) => r.shape)
        : [];

    const visible = (p: MapPoint) =>
        !fog || isRevealed(p, shapes, map.revealRadius, aspect);

    const visibleLayers = new Map(
        input.layers
            .filter((l) => layerVisibleTo(l, viewer.heroIds))
            .map((l) => [l.id, l])
    );

    const layerOk = (m: WorldMarker) =>
        m.layerId == null || visibleLayers.has(m.layerId);

    const markers = input.markers.filter((m) => {
        if (!layerOk(m)) return false;

        if (!fog || m.alwaysVisible) return true;

        return (
            visible({ x: m.x, y: m.y }) ||
            (m.kind === 'zone' &&
                !!m.polygon &&
                zoneTouchesReveal(m.polygon, shapes, map.revealRadius, aspect))
        );
    });

    return { own, fog, shapes, visible, markers, visibleLayers, layerOk };
}

export function visibleMarkerIds(input: MarkerVisibilityInput): Set<string> {
    return new Set(visibility(input).markers.map((m) => m.id));
}

export function knownMapIds(
    allMaps: WorldMapSummary[],
    heroIds: string[],
    positions: HeroPosition[],
    reveals: { mapId: string; characterId: string }[],
    currentMapId?: string
): Set<string> {
    const own = new Set(heroIds);

    const known = new Set<string>(currentMapId ? [currentMapId] : []);

    for (const pos of positions)
        if (own.has(pos.characterId)) known.add(pos.mapId);

    for (const r of reveals) if (own.has(r.characterId)) known.add(r.mapId);

    const withPath = new Set<string>();

    for (const id of known)
        for (const m of mapPath(allMaps, id)) withPath.add(m.id);

    return withPath;
}

export function buildWorldView(input: WorldViewInput): WorldView {
    const { map, allMaps, viewer } = input;

    const {
        own,
        fog,
        shapes,
        visible,
        markers: visibleMarkers,
        visibleLayers,
        layerOk,
    } = visibility(input);

    const byId = new Map(allMaps.map((m) => [m.id, m]));

    const markers = visibleMarkers.map((m) => ({ ...m, dmNote: null }));

    const layers: WorldViewLayer[] = [...visibleLayers.values()].map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        imageUrl: l.imageUrl,
        rect: l.rect,
        opacity: l.opacity,
        icon: l.icon,
        zoneOpacity: l.zoneOpacity,
        zoneLabels: l.zoneLabels,
    }));

    const heroes: WorldHero[] = [];

    for (const pos of input.positions) {
        const info = input.heroNames.get(pos.characterId);

        const at = info ? pointOnMap(pos, map.id, byId, input.markers, layerOk) : null;

        if (!info || !at) continue;

        const isOwn = own.has(pos.characterId);

        if (isOwn || visible(at))
            heroes.push({
                id: pos.characterId,
                name: info.name,
                avatar: info.avatar,
                mapId: map.id,
                x: at.x,
                y: at.y,
                own: isOwn,
            });
    }

    const withPath = knownMapIds(
        allMaps,
        viewer.heroIds,
        input.positions,
        input.reveals,
        map.id
    );

    const markerIds = new Set(markers.map((m) => m.id));

    const notes: WorldNote[] = input.notes
        .filter(
            (n) =>
                markerIds.has(n.markerId) &&
                (n.visibility === 'public' ||
                    (!viewer.asHero && n.authorUserId === viewer.userId))
        )
        .map((n) => ({
            ...n,
            mine: !viewer.asHero && n.authorUserId === viewer.userId,
        }));

    return {
        map,
        markers,
        heroes,
        reveals: shapes,
        maps: viewer.isDemo
            ? allMaps
            : allMaps.filter((m) => withPath.has(m.id)),
        notes,
        layers,
        fog,
    };
}
