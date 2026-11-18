import { activeModeWithConfig, allMapModes } from './registry';
import type { ModeAwareOutcome } from './types';

import type { BattleSceneState } from '@/lib/utils/battle/store/types';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export function modeStart(
    map: BattleMapConfig | null,
    order: BattleParticipant[]
): { participants: BattleParticipant[]; turnIndex: number } | null {
    const active = activeModeWithConfig(map);

    return (
        active?.mode.server.onStart?.({
            map: active.map,
            config: active.config,
            order,
        }) ?? null
    );
}

export function withModeAfterMutation<T extends ModeAwareOutcome>(
    map: BattleMapConfig | null,
    scene: { status: BattleSceneState['status']; round: number },
    result: T
): T {
    const active = activeModeWithConfig(map);

    return (
        active?.mode.server.afterMutation?.({
            map: active.map,
            config: active.config,
            scene,
            result,
        }) ?? result
    );
}

export function withModeAfterSettle<T extends ModeAwareOutcome>(
    map: BattleMapConfig | null,
    scene: { status: BattleSceneState['status']; round: number },
    result: T
): T {
    const active = activeModeWithConfig(map);

    return (
        active?.mode.server.afterSettle?.({
            map: active.map,
            config: active.config,
            scene,
            result,
        }) ?? result
    );
}

export function modeBlockedText(map: BattleMapConfig | null): string | null {
    const active = activeModeWithConfig(map);

    return active?.mode.server.blockedText?.(active.config) ?? null;
}

export function modeAutoSkipText(map: BattleMapConfig | null): LogLine | null {
    const active = activeModeWithConfig(map);

    return active?.mode.server.autoSkipText?.(active.config) ?? null;
}

export function modePlaceAll(
    map: BattleMapConfig | null,
    participants: BattleParticipant[]
): BattleParticipant[] | null {
    const active = activeModeWithConfig(map);

    return (
        active?.mode.server.placeAll?.({
            map: active.map,
            config: active.config,
            participants,
        }) ?? null
    );
}

export function modePlaceOne(
    map: BattleMapConfig | null,
    args: {
        participants: BattleParticipant[];
        mover: BattleParticipant;
        to: GridPoint;
    }
): BattleParticipant | null {
    const active = activeModeWithConfig(map);

    return (
        active?.mode.server.placeOne?.({
            map: active.map,
            config: active.config,
            ...args,
        }) ?? null
    );
}

export function modePlaceRevived(
    map: BattleMapConfig | null,
    args: {
        participants: BattleParticipant[];
        mover: BattleParticipant;
        from: GridPoint;
    }
): GridPoint | null | undefined {
    const active = activeModeWithConfig(map);

    return active?.mode.server.placeRevived?.({
        map: active.map,
        config: active.config,
        ...args,
    });
}

export function modeEnter(
    map: BattleMapConfig | null,
    participant: BattleParticipant
): BattleParticipant {
    const active = activeModeWithConfig(map);

    return (
        active?.mode.server.onEnter?.({ config: active.config, participant }) ??
        participant
    );
}

export function modeReset(map: BattleMapConfig): BattleMapConfig {
    const active = activeModeWithConfig(map);

    const reset = active?.mode.server.onReset;

    return active && reset
        ? active.mode.withConfig(map, reset(active.config))
        : map;
}

export function modeSnapshotSlice(
    map: BattleMapConfig
): Record<string, unknown> {
    return Object.fromEntries(
        allMapModes().map((mode) => [mode.key, mode.configOf(map)])
    );
}

export function restoreModeSlices(
    map: BattleMapConfig,
    scene: Record<string, unknown>
): BattleMapConfig {
    return allMapModes().reduce((acc, mode) => {
        const saved = scene[mode.key];

        if (saved === undefined) return acc;

        return saved || mode.configOf(acc) ? mode.withConfig(acc, saved) : acc;
    }, map);
}
