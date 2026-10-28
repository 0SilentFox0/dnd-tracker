import type { MapPoint } from "@/types/world";

export function TargetMark({ point }: { point: MapPoint }) {
  return <span aria-hidden className="atlas-draft-dot pointer-events-none" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: "translate(-50%, -50%)" }} />;
}
