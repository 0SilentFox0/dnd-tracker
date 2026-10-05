// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePlayerTurn } from "../usePlayerTurn";
import { fakeScene } from "./fake-scene";

describe("usePlayerTurn", () => {
  it("мораль ≠ 0 — фаза morale; «додатковий хід» → оверлей і дії", async () => {
    const { me, wrapper, moraleCheck, showResult } = fakeScene({ morale: 2 });

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    expect(result.current.phase).toBe("morale");

    await act(async () => result.current.rollMorale(9));

    expect(moraleCheck).toHaveBeenCalledWith({ participantId: me.basicInfo.id, d10Roll: 9 });
    expect(showResult).toHaveBeenCalledWith(expect.objectContaining({ kind: "morale-extra", d10: 9 }));
    expect(result.current.phase).toBe("acting");
  });

  it("після вичерпаної дії — відлік; «Залишитись» — назад до дій", () => {
    const { me, wrapper } = fakeScene();

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    act(() => result.current.afterAction());
    expect(result.current.phase).toBe("countdown");

    act(() => result.current.stay());
    expect(result.current.phase).toBe("acting");
  });

  it("«Завершити хід» з невикористаною дією питає підтвердження; «ні» — хід триває", async () => {
    const { me, wrapper, nextTurn, confirm } = fakeScene({ confirmAnswer: false });

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    await act(async () => result.current.endTurn());

    expect(confirm).toHaveBeenCalled();
    expect(nextTurn).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("acting");
  });

  it("«Завершити хід» після дії — без підтвердження", async () => {
    const scene = fakeScene();

    const used = { ...scene.me, actionFlags: { ...scene.me.actionFlags, hasUsedAction: true } };

    const { result } = renderHook(() => usePlayerTurn(used), { wrapper: scene.wrapper });

    await act(async () => result.current.endTurn());

    expect(scene.confirm).not.toHaveBeenCalled();
    expect(scene.nextTurn).toHaveBeenCalledWith({});
  });
});
