import { hashJson } from "@/lib/utils/battle/store/stable-json";
import type { BattleSceneState, ScenePatch } from "@/lib/utils/battle/store/types";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";

export const sceneStatePatch = (before: SystemSlot | undefined, after: SystemSlot | undefined): { sceneState: SystemSlot | null } | Record<string, never> =>
  hashJson(before ?? null) === hashJson(after ?? null) ? {} : { sceneState: after ?? null };

export function applyScenePatch(scene: BattleSceneState, patch: ScenePatch): BattleSceneState {
  const { map: _map, sceneState, ...rest } = patch;

  return { ...scene, ...rest, sceneState: sceneState === undefined ? scene.sceneState : (sceneState ?? undefined) };
}
