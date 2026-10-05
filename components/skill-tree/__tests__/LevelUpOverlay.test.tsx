// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LevelUpOverlay } from "@/components/skill-tree/progression";
import * as api from "@/lib/api/character-progression";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/api/character-progression");

let data: Record<string, unknown> | undefined;

vi.mock("@/lib/hooks/skills/useCharacterProgression", () => ({
  useCharacterProgression: () => ({ data, view: data ? { points: { free: 2 } } : null }),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.markLevelSeen).mockResolvedValue({ seenLevel: 5 });
});

const renderIt = () => render(<LevelUpOverlay campaignId="c" characterId="ch" name="Ельдріс" />);

describe("LevelUpOverlay", () => {
  it("власник, level > seenLevel → показ old → new, позначає seen одразу", () => {
    data = { level: 5, seenLevel: 3, isOwner: true };
    renderIt();

    expect(screen.getByRole("dialog", { name: "Новий рівень" })).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2 вільні очки")).toBeTruthy();
    expect(api.markLevelSeen).toHaveBeenCalledWith("c", "ch");
  });

  it("тап закриває", () => {
    data = { level: 5, seenLevel: 3, isOwner: true };
    renderIt();
    fireEvent.click(screen.getByRole("dialog", { name: "Новий рівень" }));

    expect(screen.queryByRole("dialog", { name: "Новий рівень" })).toBeNull();
  });

  it("не власник, NULL або рівень не зріс — нічого", () => {
    for (const d of [{ level: 5, seenLevel: 3, isOwner: false }, { level: 5, seenLevel: null, isOwner: true }, { level: 5, seenLevel: 5, isOwner: true }]) {
      data = d;
      renderIt();
      expect(screen.queryByRole("dialog", { name: "Новий рівень" })).toBeNull();
      cleanup();
    }

    expect(api.markLevelSeen).not.toHaveBeenCalled();
  });
});
