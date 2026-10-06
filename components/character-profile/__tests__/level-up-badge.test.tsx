// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LevelUpBadge } from "@/components/character-profile/LevelUpBadge";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

describe("LevelUpBadge", () => {
  afterEach(cleanup);

  it("з вільними очками показує LVL UP +X і відкриває вкладку", () => {
    const onOpen = vi.fn();

    render(<LevelUpBadge free={2} onOpen={onOpen} />);

    expect(screen.getByText("LVL UP +2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Вільні очки навичок: 2" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("без вільних очок — нічого", () => {
    const { container } = render(<LevelUpBadge free={0} onOpen={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });
});
