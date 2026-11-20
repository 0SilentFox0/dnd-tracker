import type { WorldMarker, WorldViewLayer } from '@/types/world';

type StyleLayer = Pick<
    WorldViewLayer,
    'id' | 'color' | 'icon' | 'zoneOpacity' | 'zoneLabels'
>;

/** Resolves marker → layer inheritance once; system defaults stay with the consumers. */
export function applyLayerStyle(
    markers: WorldMarker[],
    layers: StyleLayer[]
): WorldMarker[] {
    if (layers.length === 0) return markers;

    const byId = new Map(layers.map((l) => [l.id, l]));

    return markers.map((m) => {
        const layer = m.layerId ? byId.get(m.layerId) : undefined;

        if (!layer) return m;

        const styled = {
            ...m,
            icon: m.icon ?? layer.icon,
            color: m.color ?? layer.color,
        };

        if (m.kind !== 'zone') return styled;

        return {
            ...styled,
            fillOpacity: m.fillOpacity ?? layer.zoneOpacity,
            labelMode:
                m.labelMode ?? (layer.zoneLabels === 'hidden' ? 'hidden' : null),
        };
    });
}
