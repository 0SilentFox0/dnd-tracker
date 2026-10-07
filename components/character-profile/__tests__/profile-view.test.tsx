// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

const h = vi.hoisted(() => ({ replace: vi.fn(), editorMounts: 0, sheetQuery: { data: null as unknown, isPending: false, isError: false, error: null, refetch: () => {} } }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: h.replace, push: vi.fn() }) }));
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => <div>прокачка</div>, LevelUpOverlay: () => null }));
vi.mock("@/lib/hooks/skills", () => ({ useCharacterProgression: () => ({ view: null }) }));
vi.mock("@/lib/hooks/characters", async (orig) => ({
  ...(await orig<object>()),
  useCharacterSheet: () => h.sheetQuery,
  useCharacterGoals: () => ({ save: vi.fn(), isPending: false }),
  useDmCharacterEditor: () => {
    h.editorMounts += 1;

    return { ready: true, form: { formData: { basicInfo: {}, spellcasting: {} }, basicInfo: { level: 30 }, abilityScores: { strength: 10, setters: {} }, combatStats: {}, skills: {}, abilities: {}, spellcasting: { knownSpells: [], setters: {} }, handleSubmit: vi.fn(), setFormData: vi.fn(), loading: false, error: null }, equipped: {}, setEquipped: vi.fn(), artifacts: [], members: [], races: [], membersLoading: false, levelUp: vi.fn(), remove: vi.fn() };
  },
}));
vi.mock("@/components/character-profile/BasicEditTab", () => ({ BasicEditTab: () => <div>основне</div> }));

import { CharacterProfile } from "@/components/character-profile";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

describe("CharacterProfile — перегляд", () => {
  beforeEach(() => {
    h.sheetQuery.data = sheetFixture;
    h.replace.mockClear();
  });

  afterEach(cleanup);

  it("hero: імʼя, HP, AC, Влуч, Майст", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.getByRole("heading", { name: "Ліра" })).toBeTruthy();
    expect(screen.getByText("HP 300")).toBeTruthy();
    expect(screen.getByLabelText("AC")).toHaveTextContent("17");
    expect(screen.getByLabelText("Влучання")).toHaveTextContent("+13");
    expect(screen.getByLabelText("Майстерність")).toHaveTextContent("+9");
    expect(screen.getByLabelText("Ініціатива")).toHaveTextContent("4");
    expect(screen.getByLabelText("Ініціатива")).not.toHaveTextContent("+4");
  });

  it("бойова вкладка: ініціатива без знака", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} initialTab="combat" />);

    expect(screen.getByText("Ініціатива").parentElement).toHaveTextContent(/^Ініціатива4$/);
  });

  it("таба з URL; перемикання пише ?tab= без запиту на сервер", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} initialTab="magic" />);

    const replaceState = vi.spyOn(window.history, "replaceState");

    expect(screen.getByRole("tab", { name: "Магія" })).toHaveAttribute("data-state", "active");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Речі" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", expect.stringMatching(/\?tab=items$/));
    expect(screen.getByRole("tab", { name: "Речі" })).toHaveAttribute("data-state", "active");
    expect(h.replace).not.toHaveBeenCalled();
  });

  it("атака: влучання і середня шкода, розкладка за тапом", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    const row = screen.getByRole("button", { name: /Довгий лук/ });

    expect(row).toHaveTextContent("+13");
    expect(row).toHaveTextContent("≈68");
    fireEvent.click(row);
    expect(screen.getAllByText("Майстерність").length).toBeGreaterThan(0);
    expect(screen.getByText("Рівень + 6d8+1d6")).toBeTruthy();
  });

  it("без атак — порожній стан і «—» у чипі", () => {
    h.sheetQuery.data = withSheet({ attacks: [], bestToHit: null });
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.getByText("Немає зброї — атак поки немає")).toBeTruthy();
    expect(screen.getByLabelText("Влучання")).toHaveTextContent("—");
  });

  it("гравець не бачить «Редагувати», ДМ бачить", () => {
    const { unmount } = renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.queryByRole("button", { name: "Редагувати" })).toBeNull();
    unmount();
    h.sheetQuery.data = withSheet({ viewer: { isDM: true, isOwner: false } });
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit />);
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeTruthy();
  });

  it("гравець, що відкрив сторінку ДМа для свого персонажа, не бачить «Редагувати»", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit />);

    expect(screen.queryByRole("button", { name: "Редагувати" })).toBeNull();
  });
});

describe("CharacterProfile — редагування ДМа", () => {
  beforeEach(() => {
    h.sheetQuery.data = withSheet({ viewer: { isDM: true, isOwner: false } });
  });

  afterEach(cleanup);

  it("«Редагувати» монтує редактор лише після натискання; «Скасувати» повертає перегляд", async () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit />);

    expect(h.editorMounts).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Редагувати" }));
    expect(await screen.findByRole("tab", { name: "Основне" })).toHaveAttribute("data-state", "active");
    expect(h.editorMounts).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Зберегти" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
    expect(screen.getByRole("button", { name: "Редагувати" })).toBeTruthy();
  });

  it("«Магія» в редакторі показує книгу заклинань з листа", async () => {
    mockMatchMedia(false);
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit />);

    fireEvent.click(screen.getByRole("button", { name: "Редагувати" }));
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "Магія" }));
    fireEvent.click(screen.getByRole("button", { name: "Книга заклинань" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Книга заклинань");
    expect(screen.getByText("Мітка мисливця")).toBeTruthy();
  });
});
