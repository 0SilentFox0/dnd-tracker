import { DEFAULT_ZONE_COLOR } from '@/lib/constants/world';
import { edgeKey, sharedEdges } from '@/lib/utils/world/zone-snap';
import type { MapPoint, WorldMarker } from '@/types/world';

const asPoints = (ring: [number, number][]) =>
    ring.map(([x, y]) => `${x},${y}`).join(' ');

type Edge = { key: string; d: string; color: string };

function uniqueEdges(markers: WorldMarker[]): Edge[] {
    const edges = new Map<string, Edge>();

    for (const m of markers) {
        if (m.kind !== 'zone' || !m.polygon) continue;

        const ring = m.polygon;

        ring.forEach((a, i) => {
            const b = ring[(i + 1) % ring.length];

            if (a[0] === b[0] && a[1] === b[1]) return;

            const key = edgeKey(a, b);

            if (!edges.has(key))
                edges.set(key, {
                    key,
                    d: `M${a[0]},${a[1]}L${b[0]},${b[1]}`,
                    color: m.color ?? DEFAULT_ZONE_COLOR,
                });
        });
    }

    return [...edges.values()];
}

interface WorldZonesProps {
    markers: WorldMarker[];
    selectedId?: string | null;
    draft?: MapPoint[];
    cursor?: MapPoint | null;
    interactive?: boolean;
}

export function WorldZones({
    markers,
    selectedId,
    draft,
    cursor,
    interactive = false,
}: WorldZonesProps) {
    const last = draft?.[draft.length - 1];

    const edges = uniqueEdges(markers);

    const shared = sharedEdges(
        markers.flatMap((m) =>
            m.kind === 'zone' && m.polygon ? [m.polygon] : []
        )
    );

    return (
        <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden
        >
            {markers.map((m) => {
                if (m.kind !== 'zone' || !m.polygon) return null;

                const selected = m.id === selectedId;

                return (
                    <polygon
                        key={m.id}
                        data-zone-id={m.id}
                        data-interactive={interactive}
                        className="atlas-zone-area"
                        points={asPoints(m.polygon)}
                        fill={m.color ?? DEFAULT_ZONE_COLOR}
                        fillOpacity={selected ? 0.38 : 0.28}
                    />
                );
            })}
            {edges.map((e) => (
                <path
                    key={`u-${e.key}`}
                    data-edge-underlay
                    d={e.d}
                    fill="none"
                    stroke="var(--atlas-paper)"
                    strokeWidth={3.5}
                    strokeOpacity={0.55}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
            {edges.map((e) => (
                <path
                    key={e.key}
                    data-edge
                    data-shared-edge={shared.has(e.key) || undefined}
                    d={e.d}
                    fill="none"
                    stroke={
                        shared.has(e.key)
                            ? 'var(--atlas-ink)'
                            : `color-mix(in srgb, ${e.color} 60%, black)`
                    }
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                />
            ))}
            {markers.map((m) =>
                m.kind === 'zone' && m.polygon && m.id === selectedId ? (
                    <polygon
                        key={m.id}
                        points={asPoints(m.polygon)}
                        fill="none"
                        stroke="var(--color-hud-gold-bright, #ffe08a)"
                        strokeWidth={3}
                        vectorEffect="non-scaling-stroke"
                    />
                ) : null
            )}
            {draft && draft.length > 1 ? (
                <polyline
                    points={asPoints(draft.map((p) => [p.x, p.y]))}
                    fill="none"
                    stroke="var(--atlas-ink)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                />
            ) : null}
            {last && cursor ? (
                <line
                    x1={last.x}
                    y1={last.y}
                    x2={cursor.x}
                    y2={cursor.y}
                    stroke="var(--atlas-ink)"
                    strokeWidth={1.5}
                    strokeDasharray="2 4"
                    opacity={0.7}
                    vectorEffect="non-scaling-stroke"
                />
            ) : null}
        </svg>
    );
}
