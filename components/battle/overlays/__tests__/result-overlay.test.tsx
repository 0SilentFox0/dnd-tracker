// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { ResultOverlay } from "@/components/battle/overlays/ResultOverlay";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

describe("ResultOverlay", () => {
  afterEach(cleanup);

  it.each([
    [{ kind: "morale-extra", name: "Фрейда", d10: 9, morale: 2 }, "Бойовий дух", "додатковий хід"],
    [{ kind: "morale-skip", name: "Фрейда", d10: 2, morale: -1 }, "Паніка", "втрачає хід"],
  ] as const)("%o", (fx, title, detail) => {
    const { wrapper } = fakeScene({ result: fx });

    render(<ResultOverlay />, { wrapper });

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(new RegExp(detail))).toBeTruthy();
  });

  it("атаки й заклинання не займають екран — їх показує кутова картка", () => {
    const { wrapper } = fakeScene({ result: { kind: "hit", targetName: "Циклоп", damage: 10, downed: false, d20: 14 } });

    const { container } = render(<ResultOverlay />, { wrapper });

    expect(container.innerHTML).toBe("");
  });

  it("паніка закривається сама через 4 с", () => {
    vi.useFakeTimers();

    const { wrapper, showResult } = fakeScene({ result: { kind: "morale-skip", name: "Фрейда", d10: 2, morale: -1 } });

    render(<ResultOverlay />, { wrapper });
    act(() => vi.advanceTimersByTime(4_100));
    expect(showResult).toHaveBeenCalledWith(null);

    vi.useRealTimers();
  });
});
