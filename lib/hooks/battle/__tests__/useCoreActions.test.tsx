// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCoreActions } from "../useCoreActions";
import { fakeScene } from "./fake-scene";

import { textRef } from "@/lib/i18n/text-ref";

describe("useCoreActions", () => {
  it("items: дію витрачено — дії за дію недоступні з причиною, рух (підвестися) — з іншою", () => {
    const { me, wrapper } = fakeScene();

    const spent = { ...me, actionFlags: { ...me.actionFlags, hasUsedAction: true } };

    const { result } = renderHook(() => useCoreActions(spent), { wrapper });

    const by = (k: string) => result.current.items.find((i) => i.key === k);

    expect(by("dash")).toMatchObject({ ok: false, reason: textRef("battleActions.reject.actionUsed") });
    expect(by("standUp")).toMatchObject({ ok: false, reason: textRef("battleActions.reject.notProne") });
  });

  it("targetsFor без мапи: вороги для схоплення, союзники для допомоги", () => {
    const { me, wrapper } = fakeScene();

    const { result } = renderHook(() => useCoreActions(me), { wrapper });

    expect(result.current.targetsFor("grapple").map((p) => p.basicInfo.id)).toEqual(["gob"]);
    expect(result.current.targetsFor("help").map((p) => p.basicInfo.id)).toEqual(["ally"]);
    expect(result.current.targetsFor("dash")).toEqual([]);
  });

  it("run: будує тіло, викликає onDone; при помилці — ні", async () => {
    const { me, wrapper, coreAction } = fakeScene();

    const onDone = vi.fn();

    const { result } = renderHook(() => useCoreActions(me, onDone), { wrapper });

    let ok = false;

    await act(async () => {
      ok = await result.current.run({ key: "shove", targetId: "gob", mode: "push" });
    });

    expect(ok).toBe(true);
    expect(coreAction).toHaveBeenCalledWith({ action: "shove", participantId: "me", targetId: "gob", mode: "push" });
    expect(onDone).toHaveBeenCalledTimes(1);

    coreAction.mockRejectedValueOnce(new Error("x"));

    await act(async () => {
      ok = await result.current.run({ key: "dodge" });
    });

    expect(ok).toBe(false);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("readied.available лише при ввімкнених правилах, readied і невитраченій реакції", () => {
    const { me, wrapper, battle } = fakeScene();

    const withReady = { ...me, battleData: { ...me.battleData, readied: { kind: "attack" as const, round: 3 } } };

    expect(renderHook(() => useCoreActions(withReady), { wrapper }).result.current.readied.available).toBe(false);

    battle.rules = { ...battle.rules, actions: { ...battle.rules.actions, enabled: true } };

    expect(renderHook(() => useCoreActions(withReady), { wrapper }).result.current.readied.available).toBe(true);
    expect(renderHook(() => useCoreActions({ ...withReady, actionFlags: { ...withReady.actionFlags, hasUsedReaction: true } }), { wrapper }).result.current.readied.available).toBe(false);
    expect(renderHook(() => useCoreActions(me), { wrapper }).result.current.readied.available).toBe(false);
  });
});
