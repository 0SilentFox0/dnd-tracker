import { onMazeField } from './status';
import { MAZE_TEXTS } from './texts';

import { BattleStatus } from '@/lib/constants/battle';
import { dmEvent } from '@/lib/utils/battle/store/event-mapping';
import type {
    NewBattleEvent,
    ScenePatch,
} from '@/lib/utils/battle/store/types';
import type {
    BattleMapConfig,
    BattleParticipant,
    IllusionDisguise,
    IllusionGroup,
    IllusionPair,
    MazeConfig,
} from '@/types/battle';
import type { LogLine } from '@/types/text';

export const illusionGroups = (
    maze: MazeConfig | null | undefined
): IllusionGroup[] => {
    if (maze?.illusionSwap?.groups) return maze.illusionSwap.groups;

    return (maze?.illusionSwap?.pairs ?? []).map((pair) => ({
        heroes: [
            { id: pair.a, disguise: pair.bSees },
            { id: pair.b, disguise: pair.aSees },
        ],
    }));
};

export const expandIllusionGroups = (groups: IllusionGroup[]): IllusionPair[] =>
    groups.flatMap(({ heroes }) => {
        const pairs: IllusionPair[] = [];

        for (let i = 0; i < heroes.length; i++) {
            for (let j = i + 1; j < heroes.length; j++) {
                const a = heroes[i];
                const b = heroes[j];
                pairs.push({
                    a: a.id,
                    b: b.id,
                    aSees: b.disguise,
                    bSees: a.disguise,
                });
            }
        }

        return pairs;
    });

export const illusionPairs = (
    maze: MazeConfig | null | undefined
): IllusionPair[] =>
    maze?.illusionSwap?.groups
        ? expandIllusionGroups(maze.illusionSwap.groups)
        : (maze?.illusionSwap?.pairs ?? []);

export const areIllusionFoes = (
    pairs: IllusionPair[],
    aId: string,
    bId: string
): boolean =>
    aId !== bId &&
    pairs.some(
        (p) => (p.a === aId && p.b === bId) || (p.a === bId && p.b === aId)
    );

/** маска для глядача `viewerId`: ким він бачить `targetId` (undefined — справжнім) */
export const disguiseFor = (
    pairs: IllusionPair[],
    viewerId: string,
    targetId: string
): IllusionDisguise | undefined => {
    for (const p of pairs) {
        if (p.a === viewerId && p.b === targetId) return p.aSees;

        if (p.b === viewerId && p.a === targetId) return p.bSees;
    }

    return undefined;
};

// подія потрібна, щоб зміну лабіринту можна було відкотити (знімок пишеться лише з подією)
export function mazeOpEvent(
    round: number,
    text: LogLine,
    kind: 'op' | 'reshuffle'
): NewBattleEvent {
    const event = dmEvent(round, text);

    return {
        ...event,
        details: { ...event.details, actionDetails: { mazeEvent: kind } },
    };
}

interface PruneOutcome {
    participants: BattleParticipant[];
    events?: NewBattleEvent[];
    scene?: ScenePatch;
}

/** Знімає пари, де хтось загинув, пішов з мапи, або бій уже не активний. */
export function pruneIllusion<T extends PruneOutcome>(
    map: BattleMapConfig | null,
    scene: { status: BattleStatus; round: number },
    result: T
): T {
    const pairs = illusionPairs(map?.maze);
    const groups = map?.maze?.illusionSwap?.groups;

    if (!map?.maze || pairs.length === 0) return result;

    const active =
        (result.scene?.status ?? scene.status) === BattleStatus.ACTIVE;

    const live = new Set(
        result.participants.filter(onMazeField).map((p) => p.basicInfo.id)
    );

    let illusionSwap: NonNullable<MazeConfig['illusionSwap']>;
    let changed: boolean;
    if (groups) {
        const keptGroups = active
            ? groups
                  .map((group) => ({
                      heroes: group.heroes.filter((hero) => live.has(hero.id)),
                  }))
                  .filter((group) => group.heroes.length >= 2)
            : [];
        changed =
            keptGroups.length !== groups.length ||
            keptGroups.some(
                (group, i) => group.heroes.length !== groups[i]?.heroes.length
            );
        illusionSwap = { groups: keptGroups };
    } else {
        const kept = active
            ? pairs.filter((p) => live.has(p.a) && live.has(p.b))
            : [];
        changed = kept.length !== pairs.length;
        illusionSwap = { pairs: kept };
    }

    if (!changed) return result;

    const next: MazeConfig = { ...map.maze, illusionSwap };

    return {
        ...result,
        scene: { ...result.scene, map: { ...map, maze: next } },
        events: [
            ...(result.events ?? []),
            mazeOpEvent(
                result.scene?.round ?? scene.round,
                active
                    ? MAZE_TEXTS.ops.illusionAuto
                    : MAZE_TEXTS.ops.illusionOff,
                'op'
            ),
        ],
    };
}
