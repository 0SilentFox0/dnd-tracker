// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "./sheet-fixture";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters", async (orig) => ({
  ...(await orig<object>()),
  useCharacterTokens: () => ({ add: vi.fn().mockResolvedValue(true), remove: vi.fn().mockResolvedValue(true), isPending: false }),
}));

import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { TokenList } from "@/components/character-profile/TokenList";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet, CharacterToken } from "@/types/characters";

const token = (id: string, color: CharacterToken["color"], label: string): CharacterToken => ({ id, color, label, createdAt: "2026-10-01T10:00:00.000Z" });

const tokens = [token("1", "red", "Образив НПС"), token("2", "red", "Запізнився"), token("3", "green", "Врятував віз")];

const render = (isDM: boolean, list: CharacterToken[] = tokens) => {
  const sheet: CharacterSheet = { ...sheetFixture, viewer: { isDM, isOwner: !isDM }, story: { ...sheetFixture.story, tokens: list } };

  renderWithConfirm(
    <ProfileContext.Provider value={{ campaignId: "c", characterId: "ch", sheet, canEdit: isDM }}>
      <TokenList />
    </ProfileContext.Provider>,
  );
};

describe("Жетони", () => {
  afterEach(cleanup);

  it("показує лічильники й підписи", () => {
    render(false);

    expect(screen.getByLabelText("Червоні жетони").textContent).toBe("2");
    expect(screen.getByLabelText("Зелені жетони").textContent).toBe("1");
    expect(screen.getByText("Образив НПС")).toBeTruthy();
    expect(screen.getByText("Врятував віз")).toBeTruthy();
  });

  it("гравець не бачить керування", () => {
    render(false);

    expect(screen.queryByRole("button", { name: "+ Жетон" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Видалити жетон" })).toBeNull();
  });

  it("ДМ бачить керування", () => {
    render(true);

    expect(screen.getByRole("button", { name: "+ Жетон" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Видалити жетон" })).toHaveLength(3);
  });

  it("порожній список", () => {
    render(false, []);

    expect(screen.getByText("Жетонів ще немає")).toBeTruthy();
  });
});
