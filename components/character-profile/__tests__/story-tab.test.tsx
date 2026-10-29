// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

const { save, saveNotes } = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue(true), saveNotes: vi.fn().mockResolvedValue(true) }));

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useCharacterGoals: () => ({ save, isPending: false }), useCharacterNotes: () => ({ save: saveNotes, isPending: false }), useCharacterTokens: () => ({ add: vi.fn(), remove: vi.fn(), isPending: false }) }));

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
    saveNotes.mockClear();
  });

  it("виділення — <mark>, HTML — текст", () => {
    renderWithConfirm(<BiographyText text={"Мати ==загинула== <b>давно</b>"} />);

    expect(screen.getByText("загинула").tagName).toBe("MARK");
    expect(screen.getByText("загинула").className).toContain("bg-transparent");
    expect(screen.getByText(/<b>давно<\/b>/)).toBeTruthy();
  });

  it("гравець бачить бейдж «від гравця», редагує лише свої цілі", () => {
    inProfile(sheetFixture);

    expect(screen.getByText("characterProfile.goals.fromPlayer")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /characterProfile\.goals\.editLabel/ })).toHaveLength(1);
  });

  it("гравець додає ціль — шле свої цілі + нову, без цілей ДМа", async () => {
    inProfile(sheetFixture);

    fireEvent.click(screen.getByRole("button", { name: "characterProfile.goals.add" }));
    fireEvent.change(screen.getByRole("textbox", { name: "characterProfile.goals.textField" }), { target: { value: "Купити коня" } });
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.goals.save" }));

    await waitFor(() => expect(save).toHaveBeenCalled());

    const sent = save.mock.calls[0][0].map((g: { text: string }) => g.text);

    expect(sent).toEqual(["Повернути лук", "Купити коня"]);
  });

  it("ДМ міняє статус цілі тапом", async () => {
    inProfile(withSheet({ viewer: { isDM: true, isOwner: false } }));

    fireEvent.click(screen.getByRole("button", { name: 'characterProfile.goals.statusLabel {"name":"Знайти брата","status":"characterProfile.goals.status.active"}' }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0][0]).toMatchObject({ id: "d1", status: "done" });
    expect(save.mock.calls[0][1]).toEqual(["d1", "p1"]);
  });

  it("порожня біографія — підказка", () => {
    inProfile(withSheet({ story: { biography: null, notes: null, goals: [], tokens: [], chapters: [] } }));

    expect(screen.getByText("characterProfile.story.noBiography")).toBeTruthy();
  });

  it("Enter у полі цілі зберігає ціль і не відправляє зовнішню форму", async () => {
    const outer = vi.fn((e: Event) => e.preventDefault());

    renderWithConfirm(
      <form onSubmit={(e) => outer(e.nativeEvent)}>
        <ProfileContext.Provider value={{ campaignId: "c", characterId: "ch", sheet: withSheet({ viewer: { isDM: true, isOwner: false } }), canEdit: true }}>
          <StoryTab />
        </ProfileContext.Provider>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "characterProfile.goals.add" }));

    const input = screen.getByRole("textbox", { name: "characterProfile.goals.textField" });

    fireEvent.change(input, { target: { value: "Знайти карту" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(outer).not.toHaveBeenCalled();
  });

  it("показує відкриті глави під біографією", () => {
    const sheet = withSheet({ story: { ...sheetFixture.story, chapters: [{ id: "h1", title: "Після собору", rows: [{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Застібка єдинорога" }] }] }] }] } });

    inProfile(sheet);
    expect(screen.getByText("Після собору")).toBeTruthy();
    expect(screen.getByText("Застібка єдинорога")).toBeTruthy();
  });

  it("без глав — блок не рендериться", () => {
    inProfile(sheetFixture);
    expect(screen.queryByText("characterProfile.story.chapters")).toBeNull();
  });

  it("власник бачить нотатки і зберігає правку", async () => {
    inProfile(sheetFixture);

    expect(screen.getByText("Купити мотузку")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "characterProfile.notes.edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "characterProfile.notes.field" }), { target: { value: "Нове" } });
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.notes.save" }));

    await waitFor(() => expect(saveNotes).toHaveBeenCalledWith("Нове"));
  });

  it("не власник не бачить блок нотаток", () => {
    inProfile(withSheet({ viewer: { isDM: true, isOwner: false } }));

    expect(screen.queryByText("characterProfile.notes.title")).toBeNull();
  });
});
