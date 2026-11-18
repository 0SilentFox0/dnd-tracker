import { FOG_DEFAULT_VISION_RADIUS } from './constants';
import { fogView } from './fog-view';

import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, FogState } from '@/types/battle-grid';

export interface FogContext {
    map: BattleMapConfig | null | undefined;
    fog?: FogState;
}

export interface FogViewOptions {
    viewerId: string | null;
    isDM: boolean;
    shareAllies?: boolean;
    tileBlocksSight?: ReadonlySet<string>;
}

export const fogModeOf = (ctx: FogContext) =>
    ctx.map?.maze ? 'off' : (ctx.fog?.mode ?? 'off');

/** The single fog visibility computation shared by the battle map hook and the server redaction. */
export function fogViewOf(
    ctx: FogContext & { map: BattleMapConfig },
    participants: readonly BattleParticipant[],
    options: FogViewOptions
) {
    return fogView({
        map: ctx.map,
        participants,
        mode: fogModeOf(ctx),
        viewerId: options.viewerId,
        isDM: options.isDM,
        revealed: ctx.fog?.revealed ?? [],
        radius: ctx.fog?.visionRadius ?? FOG_DEFAULT_VISION_RADIUS,
        tileBlocksSight: options.tileBlocksSight,
        shareAllies: options.shareAllies,
    });
}

/** Placed participants that none of `viewerIds` can currently see; empty when fog is off. */
export function fogHiddenIds(
    ctx: FogContext,
    participants: readonly BattleParticipant[],
    viewerIds: readonly (string | null)[]
): Set<string> {
    const { map } = ctx;

    if (!map || fogModeOf(ctx) === 'off' || !viewerIds.length)
        return new Set();

    const seen = new Set<string>();

    for (const viewerId of viewerIds)
        for (const id of fogViewOf({ ...ctx, map }, participants, {
            viewerId,
            isDM: false,
        }).visibleIds)
            seen.add(id);

    return new Set(
        participants
            .filter(
                (p) => p.battleData.position && !seen.has(p.basicInfo.id)
            )
            .map((p) => p.basicInfo.id)
    );
}

const POSITION_KEYS = ['position', 'turnStartPosition', 'facing'] as const;

export function withoutPosition<
    T extends { battleData?: Partial<BattleParticipant['battleData']> },
>(item: T): T {
    const data = item.battleData;

    if (!data || !POSITION_KEYS.some((key) => key in data)) return item;

    const rest = { ...data };

    for (const key of POSITION_KEYS) delete rest[key];

    return { ...item, battleData: rest };
}
