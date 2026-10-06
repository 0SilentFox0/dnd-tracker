// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LevelUpBadge } from "@/components/character-profile/LevelUpBadge";

const h = vi.hoisted(() => ({ view: null as { points: { free: number } } | null }));

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/skills", () => ({ useCharacterProgression: () => ({ view: h.view }) }));

describe("LevelUpBadge", () => {
  afterEach(cleanup);

  it("з вільними очками показує LVL UP +X і відкриває вкладку", () => {
    h.view = { points: { free: 2 } };

    const onOpen = vi.fn();

    render(<LevelUpBadge campaignId="c1" characterId="h1" onOpen={onOpen} />);

    expect(screen.getByText("LVL UP +2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Вільні очки навичок: 2" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("без вільних очок або без прогресії — нічого", () => {
    h.view = { points: { free: 0 } };

    const { container, rerender } = render(<LevelUpBadge campaignId="c1" characterId="h1" onOpen={vi.fn()} />);

    expect(container.firstChild).toBeNull();

    h.view = null;
    rerender(<LevelUpBadge campaignId="c1" characterId="h1" onOpen={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });
});
