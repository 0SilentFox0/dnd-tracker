// @vitest-environment happy-dom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { ResultOverlay } from "@/components/battle/fx/ResultOverlay";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

describe("ResultOverlay", () => {
  it.each([
    [{ kind: "hit", targetName: "Циклоп", damage: 10, downed: true, d20: 14 }, "Влучання", "−10"],
    [{ kind: "crit", targetName: "Циклоп", damage: 24, downed: false, d20: 20 }, "Критичне влучання", "−24"],
    [{ kind: "miss", targetName: "Гоблін", d20: 13, known: "≥ 14" }, "Промах", "тепер відомо: AC ≥ 14"],
    [{ kind: "morale-extra", name: "Фрейда", d10: 9, morale: 2 }, "Бойовий дух", "додатковий хід"],
    [{ kind: "morale-skip", name: "Фрейда", d10: 2, morale: -1 }, "Паніка", "втрачає хід"],
  ] as const)("%o", (fx, title, detail) => {
    const { wrapper } = fakeScene({ result: fx });

    render(<ResultOverlay />, { wrapper });

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(new RegExp(detail))).toBeTruthy();
  });

  it("закривається кнопкою; паніка — сама через 4 с", () => {
    vi.useFakeTimers();

    const { wrapper, showResult } = fakeScene({ result: { kind: "morale-skip", name: "Фрейда", d10: 2, morale: -1 } });

    render(<ResultOverlay />, { wrapper });
    act(() => vi.advanceTimersByTime(4_100));
    expect(showResult).toHaveBeenCalledWith(null);

    vi.useRealTimers();

    const second = fakeScene({ result: { kind: "hit", targetName: "Циклоп", damage: 10, downed: false, d20: 14 } });

    const { container } = render(<ResultOverlay />, { wrapper: second.wrapper });

    fireEvent.click(within(container).getByRole("button", { name: "Деталі шкоди" }));
    expect(second.showResult).toHaveBeenCalledWith(null);
  });
});
