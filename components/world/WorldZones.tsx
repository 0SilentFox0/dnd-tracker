import { DEFAULT_ZONE_COLOR } from "@/lib/constants/world";
import type { MapPoint, WorldMarker } from "@/types/world";

const asPoints = (ring: [number, number][]) => ring.map(([x, y]) => `${x},${y}`).join(" ");

interface WorldZonesProps {
  markers: WorldMarker[];
  selectedId?: string | null;
  draft?: MapPoint[];
  cursor?: MapPoint | null;
  interactive?: boolean;
}

export function WorldZones({ markers, selectedId, draft, cursor, interactive = false }: WorldZonesProps) {
  const last = draft?.[draft.length - 1];

  return (
    <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      {markers.map((m) => {
        if (m.kind !== "zone" || !m.polygon) return null;

        const color = m.color ?? DEFAULT_ZONE_COLOR;

        const selected = m.id === selectedId;

        const points = asPoints(m.polygon);

        return (
          <g key={m.id}>
            <polygon
              data-zone-id={m.id}
              data-interactive={interactive}
              className="atlas-zone-area"
              points={points}
              fill={color}
              fillOpacity={selected ? 0.34 : 0.22}
              stroke="var(--atlas-ink)"
              strokeWidth={selected ? 4.5 : 1.5}
              strokeDasharray={selected ? undefined : "6 4"}
              vectorEffect="non-scaling-stroke"
            />
            {selected ? <polygon points={points} fill="none" stroke="var(--atlas-paper)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" /> : null}
          </g>
        );
      })}
      {draft && draft.length > 1 ? (
        <polyline points={asPoints(draft.map((p) => [p.x, p.y]))} fill="none" stroke="var(--atlas-ink)" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      ) : null}
      {last && cursor ? <line x1={last.x} y1={last.y} x2={cursor.x} y2={cursor.y} stroke="var(--atlas-ink)" strokeWidth={1.5} strokeDasharray="2 4" opacity={0.7} vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  );
}
