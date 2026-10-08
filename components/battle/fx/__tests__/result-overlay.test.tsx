// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { ResultOverlay } from "@/components/battle/fx/ResultOverlay";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

describe("ResultOverlay", () => {
  afterEach(cleanup);

  it.each([
    [{ kind: "hit", targetName: "Циклоп", damage: 10, downed: true, d20: 14 }, "Влучання", "−10"],
    [{ kind: "crit", targetName: "Циклоп", damage: 24, downed: false, d20: 20 }, "Критичне влучання", "−24"],
    [{ kind: "miss", targetName: "Гоблін", d20: 13, known: "≥ 14" }, "Промах", "тепер відомо: AC ≥ 14"],
    [{ kind: "hit", targetName: "Циклоп", damage: 10, downed: false, d20: 14, retaliation: { name: "Циклоп", damage: 4 } }, "Влучання", "Відповідь цілі: Циклоп −4"],
    [{ kind: "miss", targetName: "Гоблін", d20: 13, known: "≥ 14", retaliation: { name: "Гоблін", damage: 0 } }, "Промах", "Відповідь цілі: Гоблін промах"],
    [{ kind: "crit", targetName: "Циклоп", damage: 24, downed: false, d20: 20, critEffect: { name: "Безкоштовна атака", flavor: "Вихор сталі: Айвен одразу ж б'є знову." } }, "Критичне влучання", "Безкоштовна атака"],
    [{ kind: "crit", targetName: "Циклоп", damage: 24, downed: false, d20: 20, critEffect: { name: "Безкоштовна атака", flavor: "Вихор сталі: Айвен одразу ж б'є знову." } }, "Критичне влучання", "Вихор сталі: Айвен"],
    [{ kind: "miss", targetName: "Гоблін", d20: 1, known: "≥ 14", critFail: { name: "Падіння", flavor: "Ви спотикаєтесь." } }, "Критична невдача", "Падіння"],
    [{ kind: "miss", targetName: "Гоблін", d20: 1, known: "≥ 14", critFail: { name: "Падіння", flavor: "Ви спотикаєтесь." } }, "Критична невдача", "Ви спотикаєтесь"],
    [{ kind: "morale-extra", name: "Фрейда", d10: 9, morale: 2 }, "Бойовий дух", "додатковий хід"],
    [{ kind: "morale-skip", name: "Фрейда", d10: 2, morale: -1 }, "Паніка", "втрачає хід"],
  ] as const)("%o", (fx, title, detail) => {
    const { wrapper } = fakeScene({ result: fx });

    render(<ResultOverlay />, { wrapper });

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(new RegExp(detail))).toBeTruthy();
  });

  it("крит без ефекту (старі записи) — лише заголовок; критична невдача без «Промах»", () => {
    const a = fakeScene({ result: { kind: "crit", targetName: "Циклоп", damage: 24, downed: false, d20: 20 } });

    render(<ResultOverlay />, { wrapper: a.wrapper });
    expect(screen.getByText("Критичне влучання")).toBeTruthy();
    cleanup();

    const b = fakeScene({ result: { kind: "miss", targetName: "Гоблін", d20: 1, known: "?", critFail: { name: "Падіння" } } });

    render(<ResultOverlay />, { wrapper: b.wrapper });
    expect(screen.queryByText("Промах")).toBeNull();
  });

  it("критична невдача — кубик «1», без плоского «Промах»; звичайний промах без кубика", () => {
    const a = fakeScene({ result: { kind: "miss", targetName: "Гоблін", d20: 1, known: "?", critFail: { name: "Падіння", flavor: "Ви спотикаєтесь." } } });

    const { container } = render(<ResultOverlay />, { wrapper: a.wrapper });

    expect(screen.getByText("Падіння")).toBeTruthy();
    expect(within(container).getByText("1", { selector: "div" })).toBeTruthy();
    cleanup();

    const b = fakeScene({ result: { kind: "miss", targetName: "Гоблін", d20: 13, known: "?" } });

    const plain = render(<ResultOverlay />, { wrapper: b.wrapper });

    expect(screen.getByText("Промах")).toBeTruthy();
    expect(within(plain.container).queryByText("13", { selector: "div" })).toBeNull();
  });

  it("критичне влучання показує кубик з d20", () => {
    const { wrapper } = fakeScene({ result: { kind: "crit", targetName: "Циклоп", damage: 24, downed: false, d20: 20 } });

    const { container } = render(<ResultOverlay />, { wrapper });

    expect(within(container).getByText("20", { selector: "div" })).toBeTruthy();
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

    fireEvent.click(within(container).getByRole("button", { name: "Далі" }));
    expect(second.showResult).toHaveBeenCalledWith(null);
  });

  it("влучання без кнопки «Деталі шкоди», закривається тапом і не відкриває журнал", () => {
    const s = fakeScene({ result: { kind: "hit", targetName: "Циклоп", damage: 10, downed: false, d20: 14 } });

    const { container } = render(<ResultOverlay />, { wrapper: s.wrapper });

    expect(within(container).queryByRole("button", { name: "Деталі шкоди" })).toBeNull();
    fireEvent.click(within(container).getByText("Влучання"));

    expect(s.showResult).toHaveBeenCalledWith(null);
    expect(s.openLog).not.toHaveBeenCalled();
  });
});
