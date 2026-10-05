// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TurnCountdown } from "@/components/battle/scene/TurnCountdown";

describe("TurnCountdown", () => {
  it("рахує секунди і викликає onElapsed; «Залишитись» скасовує", () => {
    vi.useFakeTimers();

    const onElapsed = vi.fn();

    const onStay = vi.fn();

    const { unmount } = render(<TurnCountdown seconds={5} onElapsed={onElapsed} onStay={onStay} />);

    expect(screen.getByText("5")).toBeTruthy();

    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByText("3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Залишитись" }));
    expect(onStay).toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(5_000));
    unmount();

    const second = vi.fn();

    render(<TurnCountdown seconds={2} onElapsed={second} onStay={() => {}} />);
    act(() => vi.advanceTimersByTime(2_100));
    expect(second).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
