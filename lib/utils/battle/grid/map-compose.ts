import { type aimView, deriveTrajectory, type MapScene } from './map-scene';
import { derivePathPreview } from './path-preview';

import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapConfig,
    BattleMapView,
    GridPoint,
} from '@/types/battle-grid';

interface ComposeMapViewInput {
    scene: MapScene;
    map: BattleMapConfig;
    rules: Ruleset;
    current: BattleParticipant | null;
    hover: { cell: GridPoint | null; preview: ReturnType<typeof aimView> };
    overlay: Pick<
        BattleMapView,
        'returnId' | 'impactFor' | 'effects' | 'round' | 'mode'
    > & { pendingStroke: ReadonlySet<string> };
}

export function composeMapView({
    scene,
    map,
    rules,
    current,
    hover,
    overlay,
}: ComposeMapViewInput): BattleMapView {
    const { preview, cell } = hover;

    const { returnId, pendingStroke, ...rest } = overlay;

    const marks = preview ? preview.marks : scene.view.marks;

    return {
        ...scene.view,
        ...preview,
        marks,
        trajectory: deriveTrajectory(
            {
                map,
                participants: scene.participants,
                marks: scene.view.marks,
                current,
                rules,
            },
            cell
        ),
        pathPreview: derivePathPreview(scene.view.reach, current, cell, rules),
        ...(returnId && { returnId }),
        ...(pendingStroke.size > 0 && { pendingStroke }),
        ...rest,
    };
}
