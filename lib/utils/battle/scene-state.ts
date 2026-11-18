import { hashJson } from '@/lib/utils/battle/store/stable-json';
import type {
    BattleSceneState,
    ScenePatch,
} from '@/lib/utils/battle/store/types';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';

export const resetSceneState = (
    rules: Ruleset,
    slot: SystemSlot | undefined
): SystemSlot | undefined =>
    (ruleSystemOf(rules).combat.turn?.resetScene ?? []).reduce(
        (acc, reset) => reset(acc),
        slot
    );

export const upgradeSceneState = (
    rules: Ruleset,
    slot: SystemSlot | undefined,
    legacy: Record<string, unknown>
): SystemSlot | undefined =>
    (ruleSystemOf(rules).combat.turn?.upgradeScene ?? []).reduce(
        (acc, upgrade) => upgrade(acc, legacy),
        slot
    );

/** Patch for a turn change: only the slot that actually changed */
export const sceneResetPatch = (
    rules: Ruleset,
    slot: SystemSlot | undefined
) => sceneStatePatch(slot, resetSceneState(rules, slot));

export const sceneStatePatch = (
    before: SystemSlot | undefined,
    after: SystemSlot | undefined
): { sceneState: SystemSlot | null } | Record<string, never> =>
    hashJson(before ?? null) === hashJson(after ?? null)
        ? {}
        : { sceneState: after ?? null };

export function applyScenePatch(
    scene: BattleSceneState,
    patch: ScenePatch
): BattleSceneState {
    const {
        map: _map,
        mapState: _mapState,
        mapRef: _mapRef,
        sceneState,
        ...rest
    } = patch;

    return {
        ...scene,
        ...rest,
        sceneState:
            sceneState === undefined
                ? scene.sceneState
                : (sceneState ?? undefined),
    };
}
