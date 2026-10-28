// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCritChoiceDialog } from "../useCritChoiceDialog";
import { fakeScene } from "./fake-scene";

import { critEffectsFor } from "@/lib/utils/battle/crit-choice/catalog";

const pending = { action: "attack" as const, actorId: "me", triggers: [{ key: "t0", source: "attack" as const, kind: "success" as const, actorId: "me", targetId: "gob" }, { key: "t1", source: "save" as const, kind: "fail" as const, actorId: "me", targetId: "ally" }] };

describe("useCritChoiceDialog", () => {
  it("без pending: порожньо", () => {
    const scene = fakeScene({ isDM: true });

    const { result } = renderHook(() => useCritChoiceDialog(), { wrapper: scene.wrapper });

    expect(result.current).toMatchObject({ open: false, rows: [] });
  });

  it("рядки: імена учасників і опції за джерелом та видом тригера", () => {
    const scene = fakeScene({ isDM: true });

    scene.battle.pendingCritChoice = pending;

    const { result } = renderHook(() => useCritChoiceDialog(), { wrapper: scene.wrapper });

    expect(result.current.rows.map((r) => [r.trigger.key, r.actorName, r.targetName])).toEqual([["t0", "Фрейда", "Гоблін"], ["t1", "Фрейда", "Годрік"]]);
    expect(result.current.rows[0].options).toBe(critEffectsFor("attack", "success"));
    expect(result.current.rows[1].options).toBe(critEffectsFor("save", "fail"));
  });

  it("open: лише для ДМ із pending", () => {
    const dm = fakeScene({ isDM: true });

    dm.battle.pendingCritChoice = pending;

    expect(renderHook(() => useCritChoiceDialog(), { wrapper: dm.wrapper }).result.current.open).toBe(true);

    const player = fakeScene({ isDM: false });

    player.battle.pendingCritChoice = pending;

    expect(renderHook(() => useCritChoiceDialog(), { wrapper: player.wrapper }).result.current.open).toBe(false);
  });

  it("cancel відправляє { cancel: true }", () => {
    const scene = fakeScene({ isDM: true });

    scene.battle.pendingCritChoice = pending;

    const { result } = renderHook(() => useCritChoiceDialog(), { wrapper: scene.wrapper });

    act(() => result.current.cancel());

    expect(scene.value.actions.critChoice.mutate).toHaveBeenCalledWith({ cancel: true });
  });

  it("submit відправляє choices мутацією; isSubmitting береться з мутації", () => {
    const scene = fakeScene({ isDM: true });

    scene.battle.pendingCritChoice = pending;

    const { result } = renderHook(() => useCritChoiceDialog(), { wrapper: scene.wrapper });

    act(() => result.current.submit({ t0: 3, t1: "random" }));

    expect(scene.value.actions.critChoice.mutate).toHaveBeenCalledWith({ choices: { t0: 3, t1: "random" } });
    expect(result.current.isSubmitting).toBe(false);
  });
});
