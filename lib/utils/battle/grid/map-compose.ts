import { type aimView, deriveTrajectory, type MapScene } from "./map-scene";

import type { BattleMapConfig, BattleMapView, BattleParticipant, GridPoint } from "@/types/battle";

interface ComposeMapViewInput {
  scene: MapScene;
  map: BattleMapConfig;
  current: BattleParticipant | null;
  hover: { cell: GridPoint | null; preview: ReturnType<typeof aimView> };
  overlay: Pick<BattleMapView, "returnId" | "impactFor" | "effects" | "round" | "mode"> & { pendingStroke: ReadonlySet<string> };
}

/** Вид карти для рендера: сцена + прев'ю під курсором + службові накладки. */
export function composeMapView({ scene, map, current, hover, overlay }: ComposeMapViewInput): BattleMapView {
  const { preview, cell } = hover;

  const { returnId, pendingStroke, ...rest } = overlay;

  // прев'ю під курсором замінює клікнутий шаблон, але не затемнення поза дальністю
  const marks = preview ? new Map([...[...(scene.view.marks ?? [])].filter(([, m]) => m === "out-of-range"), ...preview.marks]) : scene.view.marks;

  return {
    ...scene.view,
    ...preview,
    marks,
    trajectory: deriveTrajectory({ map, participants: scene.participants, marks: scene.view.marks, current }, cell),
    ...(returnId && { returnId }),
    ...(pendingStroke.size > 0 && { pendingStroke }),
    ...rest,
  };
}
