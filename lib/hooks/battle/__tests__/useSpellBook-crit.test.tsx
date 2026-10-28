// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const lib = vi.hoisted(() => ({
  spells: [{ id: "ray", name: "Палаючий промінь", level: 2, dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" } }],
}));

vi.mock("@/lib/hooks/spells", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/hooks/spells")>()),
  useSpells: vi.fn(() => ({ data: undefined })),
  useSpellsByIds: vi.fn((_c: string, ids: string[]) => ({ data: lib.spells.filter((s) => ids.includes(s.id)) })),
}));

import { useSpellBook } from "../useSpellBook";
import { fakeScene } from "./fake-scene";

import type { BattleAction } from "@/types/battle";

describe("useSpellBook: пауза на вибір крита ДМ", () => {
  it("очікування без результату, після зняття pending — результат з нових записів журналу", async () => {
    const log = [{ actionIndex: 7, actionType: "spell", actorId: "me", targets: [], hpChanges: [{ participantId: "gob", participantName: "Гоблін", oldHp: 20, newHp: 11, change: 9 }], actionDetails: {} }] as unknown as BattleAction[];

    const scene = fakeScene({ knownSpells: ["ray"], slots: { "2": { max: 2, current: 2 } }, afterLog: log });

    scene.battle.pendingCritChoice = { action: "spell", actorId: "me", triggers: [] };
    scene.castSpell.mockResolvedValue({ hpChanges: [], pendingCritChoice: true });

    const hook = renderHook(() => useSpellBook({ ...scene.me, basicInfo: { ...scene.me.basicInfo, sourceType: "character" } }), { wrapper: scene.wrapper });

    act(() => hook.result.current.actions.open(2));
    await waitFor(() => expect(hook.result.current.view.spells).toHaveLength(1));
    act(() => hook.result.current.actions.pick(hook.result.current.view.spells[0]));
    act(() => hook.result.current.actions.toTargets());
    act(() => hook.result.current.actions.toggleTarget("gob"));
    act(() => hook.result.current.actions.confirmTargets());
    act(() => hook.result.current.actions.setDamage(0, 4));
    act(() => hook.result.current.actions.toSummary());
    act(() => hook.result.current.actions.submit());

    await waitFor(() => expect(hook.result.current.state.waitingCrit).toBe(true));
    expect(scene.showResult).not.toHaveBeenCalled();

    scene.battle.pendingCritChoice = null;
    hook.rerender();

    await waitFor(() => expect(scene.showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "spell", changes: [{ name: "Гоблін", change: 9 }] })));
    expect(hook.result.current.state).toMatchObject({ step: "result", waitingCrit: false });
  });
});
