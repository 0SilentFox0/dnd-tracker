import { FOG_DEFAULT_VISION_RADIUS } from './constants';
import { fogView } from './fog-view';

import { CONTROLLED_BY_DM } from '@/lib/constants/characters';
import { isFallen } from '@/lib/utils/battle/grid/occupancy';
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
    viewerIds: readonly (string | null)[],
    { shareAllies = false }: { shareAllies?: boolean } = {}
): Set<string> {
    const { map } = ctx;

    if (!map || fogModeOf(ctx) === 'off' || !viewerIds.length)
        return new Set();

    const seen = new Set<string>();

    for (const viewerId of viewerIds)
        for (const id of fogViewOf({ ...ctx, map }, participants, {
            viewerId,
            isDM: false,
            shareAllies,
        }).visibleIds)
            seen.add(id);

    const viewerSides = new Set(
        participants
            .filter((p) => viewerIds.includes(p.basicInfo.controlledBy))
            .map((p) => p.basicInfo.side)
    );

    // fogView never lists fallen tokens, but a downed hero stays known to its side
    const knownToViewers = (p: BattleParticipant) =>
        isFallen(p) &&
        (viewerIds.includes(p.basicInfo.controlledBy) ||
            viewerSides.has(p.basicInfo.side));

    return new Set(
        participants
            .filter(
                (p) =>
                    p.battleData.position &&
                    !seen.has(p.basicInfo.id) &&
                    !knownToViewers(p)
            )
            .map((p) => p.basicInfo.id)
    );
}

/** Players are allies: one visibility union over every player-controlled participant's owner, shared by GET and Pusher paths. */
export function fogHiddenForPlayers(
    ctx: FogContext,
    participants: readonly BattleParticipant[]
): Set<string> {
    const ids = new Set(
        participants
            .map((p) => p.basicInfo.controlledBy)
            .filter((id) => id !== CONTROLLED_BY_DM)
    );

    return fogHiddenIds(ctx, participants, ids.size ? [...ids] : [null], {
        shareAllies: true,
    });
}

const POSITION_KEYS = ['position', 'turnStartPosition', 'facing'] as const;

export function withoutPosition<
    T extends { battleData?: Partial<BattleParticipant['battleData']> },
>(item: T): T {
    const data = item.battleData;

    if (
        !data ||
        !(POSITION_KEYS.some((key) => key in data) || data.airborne?.landAt)
    )
        return item;

    const rest = { ...data };

    for (const key of POSITION_KEYS) delete rest[key];

    if (rest.airborne?.landAt) {
        const { landAt: _landAt, ...airborne } = rest.airborne;

        rest.airborne = airborne;
    }

    return { ...item, battleData: rest };
}
