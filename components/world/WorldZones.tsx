import { DEFAULT_ZONE_COLOR } from "@/lib/constants/world";
import type { MapPoint, WorldMarker } from "@/types/world";

const asPoints = (ring: [number, number][]) => ring.map(([x, y]) => `${x},${y}`).join(" ");

export function WorldZones({ markers, selectedId, draft }: { markers: WorldMarker[]; selectedId?: string | null; draft?: MapPoint[] }) {
  return (
    <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      {markers.map((m) => {
        if (m.kind !== "zone" || !m.polygon) return null;

        const color = m.color ?? DEFAULT_ZONE_COLOR;

        return (
          <polygon
            key={m.id}
            points={asPoints(m.polygon)}
            fill={color}
            fillOpacity={0.28}
            stroke={color}
            strokeWidth={m.id === selectedId ? 4 : 1.5}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {draft && draft.length > 1 ? (
        <polyline points={asPoints(draft.map((p) => [p.x, p.y]))} fill="none" stroke={DEFAULT_ZONE_COLOR} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}
