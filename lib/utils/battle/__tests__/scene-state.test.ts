import { describe, expect, it } from "vitest";

import { applyScenePatch, sceneStatePatch } from "@/lib/utils/battle/scene-state";
import type { BattleSceneState } from "@/lib/utils/battle/store/types";

const slot = (data: unknown) => ({ key: "k", data });

describe("sceneStatePatch", () => {
  it("d20: nothing before or after gives no patch", () => {
    expect(sceneStatePatch(undefined, undefined)).toEqual({});
  });

  it("key order does not count as a change", () => {
    expect(sceneStatePatch(slot({ a: true, b: true }), slot({ b: true, a: true }))).toEqual({});
  });

  it("a change patches the new slot, a removal patches null", () => {
    expect(sceneStatePatch(undefined, slot({ a: true }))).toEqual({ sceneState: slot({ a: true }) });
    expect(sceneStatePatch(slot({ a: true }), undefined)).toEqual({ sceneState: null });
  });
});

describe("applyScenePatch", () => {
  const scene = { id: "b", sceneState: slot({ a: true }) } as unknown as BattleSceneState;

  it("keeps the state without a key, clears it on null, replaces it on a slot", () => {
    expect(applyScenePatch(scene, { round: 2 }).sceneState).toEqual(slot({ a: true }));
    expect(applyScenePatch(scene, { sceneState: null }).sceneState).toBeUndefined();
    expect(applyScenePatch(scene, { sceneState: slot({ b: true }) }).sceneState).toEqual(slot({ b: true }));
    expect("map" in applyScenePatch(scene, { map: null })).toBe(false);
  });
});
