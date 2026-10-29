import { cellCenter, parseCellKey, UNIT } from "@/lib/utils/battle/grid";
import type { BattleMapView } from "@/types/battle";

interface RangedHintProps {
  from: { cx: number; cy: number };
  trajectory: NonNullable<BattleMapView["trajectory"]>;
}

/** Пунктир пострілу до цілі; укриття на шляху підсвічені й ріжуть шкоду вдвічі. */
export function RangedHint({ from, trajectory }: RangedHintProps) {
  const end = cellCenter(trajectory.to);

  const color = trajectory.cover ? "#e0603a" : "#f2c14e";

  return (
    <g pointerEvents="none">
      <line data-map-attack-hint="ranged" x1={from.cx} y1={from.cy} x2={end.x} y2={end.y} stroke={color} strokeWidth={4} strokeDasharray="12 10" vectorEffect="non-scaling-stroke" pointerEvents="none" />
      <circle cx={end.x} cy={end.y} r={UNIT * 0.18} fill={color} />
      {trajectory.cover?.map((key) => {
        const c = cellCenter(parseCellKey(key));

        return <rect key={key} x={c.x - UNIT / 2} y={c.y - UNIT / 2} width={UNIT} height={UNIT} fill="rgba(224,96,58,.3)" stroke="#e0603a" strokeWidth={2} vectorEffect="non-scaling-stroke" />;
      })}
      {trajectory.cover && (
        <text x={end.x} y={end.y - UNIT * 0.45} textAnchor="middle" fontSize={UNIT * 0.32} fontWeight={700} fill="#ffd2b8" stroke="#3a1a10" strokeWidth={3} paintOrder="stroke">
          🧱 ×0.5
        </text>
      )}
    </g>
  );
}
