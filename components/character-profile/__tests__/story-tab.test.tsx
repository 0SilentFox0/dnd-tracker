// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

const { save } = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue(true) }));

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useCharacterGoals: () => ({ save, isPending: false }) }));

import { BiographyText, StoryTab } from "@/components/character-profile";
import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";

const inProfile = (sheet: CharacterSheet) =>
  renderWithConfirm(
    <ProfileContext.Provider value={{ campaignId: "c", characterId: "ch", sheet, canEdit: sheet.viewer.isDM }}>
      <StoryTab />
    </ProfileContext.Provider>,
  );

describe("Історія", () => {
  afterEach(() => {
    cleanup();
    save.mockClear();
  });

  it("виділення — <mark>, HTML — текст", () => {
    renderWithConfirm(<BiographyText text={"Мати ==загинула== <b>давно</b>"} />);

    expect(screen.getByText("загинула").tagName).toBe("MARK");
    expect(screen.getByText("загинула").className).toContain("bg-transparent");
    expect(screen.getByText(/<b>давно<\/b>/)).toBeTruthy();
  });

  it("гравець бачить бейдж «від гравця», редагує лише свої цілі", () => {
    inProfile(sheetFixture);

    expect(screen.getByText("від гравця")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Редагувати ціль/ })).toHaveLength(1);
  });

  it("гравець додає ціль — шле свої цілі + нову, без цілей ДМа", async () => {
    inProfile(sheetFixture);

    fireEvent.click(screen.getByRole("button", { name: "Додати ціль" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Текст цілі" }), { target: { value: "Купити коня" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти ціль" }));

    await waitFor(() => expect(save).toHaveBeenCalled());

    const sent = save.mock.calls[0][0].map((g: { text: string }) => g.text);

    expect(sent).toEqual(["Повернути лук", "Купити коня"]);
  });

  it("ДМ міняє статус цілі тапом", async () => {
    inProfile(withSheet({ viewer: { isDM: true, isOwner: false } }));

    fireEvent.click(screen.getByRole("button", { name: "Статус «Знайти брата»: активна" }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0][0]).toMatchObject({ id: "d1", status: "done" });
  });

  it("порожня біографія — підказка", () => {
    inProfile(withSheet({ story: { biography: null, goals: [] } }));

    expect(screen.getByText("Біографію ще не написано")).toBeTruthy();
  });
});
