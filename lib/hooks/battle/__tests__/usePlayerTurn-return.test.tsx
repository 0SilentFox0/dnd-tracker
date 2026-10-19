// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePlayerTurn } from "../usePlayerTurn";
import { fakeScene } from "./fake-scene";

const check = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils/battle/grid", async (orig) => ({ ...(await orig<object>()), checkReturnToStart: check }));

const map = { width: 5, height: 5 } as never;

describe("usePlayerTurn · удар і повернення", () => {
  beforeEach(() => check.mockReset());

  it("поки повернення доступне — відліку нема; кнопка викликає move з returnToStart", () => {
    check.mockReturnValue({ ok: true, to: { x: 1, y: 1 } });

    const { me, wrapper, move } = fakeScene({ map });

    const start = { ...me, battleData: { ...me.battleData, turnStartPosition: { x: 1, y: 1 } } };

    const { result } = renderHook(() => usePlayerTurn(start), { wrapper });

    act(() => result.current.actions.afterAction());
    expect(result.current.phase).toBe("acting");
    expect(result.current.strikeAndReturn.available).toBe(true);

    act(() => result.current.strikeAndReturn.run());
    expect(move).toHaveBeenCalledWith({ participantId: "me", to: { x: 1, y: 1 }, returnToStart: true });
  });

  it("повернення вичерпано — відлік стартує", () => {
    check.mockReturnValue({ ok: false, error: "x" });

    const { me, wrapper } = fakeScene({ map });

    const { result } = renderHook(() => usePlayerTurn(me), { wrapper });

    act(() => result.current.actions.afterAction());
    expect(result.current.phase).toBe("countdown");
    expect(result.current.strikeAndReturn.available).toBe(false);
  });
});
