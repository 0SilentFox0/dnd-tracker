// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

const h = vi.hoisted(() => ({ replace: vi.fn(), editorMounts: 0, sheetQuery: { data: null as unknown, isPending: false, isError: false, error: null, refetch: () => {} } }));

vi.mock("@/lib/hooks/notifications", () => ({ useSeenOnOpen: () => new Set<string>(), useNotifications: () => ({ data: undefined }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: h.replace, push: vi.fn() }) }));
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => <div>прокачка</div>, LevelUpOverlay: () => null }));
vi.mock("@/lib/hooks/campaigns", async (orig) => ({ ...(await orig<object>()), useCampaignRules: () => ({ data: undefined }) }));
vi.mock("@/lib/hooks/skills", () => ({ useCharacterProgression: () => ({ view: null }) }));
vi.mock("@/lib/hooks/characters/useStash", async (orig) => ({
  ...(await orig<object>()),
  useStash: () => ({ data: { purse: { gp: 0, sp: 0, cp: 0 }, items: [], artifacts: [] }, isPending: false, isError: false }),
  useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useInventoryLog: () => ({ data: { pages: [] }, isPending: false }),
  useFreeArtifacts: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/characters", async (orig) => ({
  ...(await orig<object>()),
  useCharacterRoster: () => ({ data: [], isLoading: false }),
  useTransferArtifact: () => ({ mutateAsync: vi.fn(), isPending: false }), useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCharacterSheet: () => h.sheetQuery,
  useCharacterGoals: () => ({ save: vi.fn(), isPending: false }),
  useDmCharacterEditor: () => {
    h.editorMounts += 1;

    return { ready: true, form: { formData: { basicInfo: {}, spellcasting: {} }, basicInfo: { data: { level: 30 }, set: vi.fn() }, abilityScores: { data: { strength: 10 }, set: vi.fn() }, combatStats: { data: {}, set: vi.fn() }, skills: { data: {}, handlers: {} }, abilities: { data: {}, set: vi.fn() }, spellcasting: { data: { knownSpells: [] }, set: vi.fn() }, status: { isLoading: false, error: null }, actions: { handleSubmit: vi.fn(), setFormData: vi.fn() } }, equipped: {}, setEquipped: vi.fn(), artifacts: [], options: { members: [], races: [], membersLoading: false }, dmActions: { levelUp: vi.fn(), remove: vi.fn() } };
  },
}));
vi.mock("@/components/character-profile/BasicEditTab", () => ({ BasicEditTab: () => <div>основне</div> }));

import { CharacterProfile } from "@/components/character-profile";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

describe("CharacterProfile — перегляд", () => {
  beforeEach(() => {
    h.sheetQuery.data = sheetFixture;
    h.replace.mockClear();
  });

  afterEach(cleanup);

  it("вкладка вмінь зветься «Шлях» лише для героя з класами", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);
    expect(screen.queryByRole("tab", { name: "characterProfile.tabs.path" })).toBeNull();
    expect(screen.getByRole("tab", { name: "characterProfile.tabs.skills" })).toBeTruthy();

    cleanup();
    h.sheetQuery.data = { ...sheetFixture, classProgression: [{ classId: "f", className: "Fighter", color: null, subclasses: [], subclassLevel: null, rows: [] }] };
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.getByRole("tab", { name: "characterProfile.tabs.path" })).toBeTruthy();
  });

  it("hero: імʼя, HP, AC, Влуч, Майст", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.getByRole("heading", { name: "Ліра" })).toBeTruthy();
    expect(screen.getByText('characterProfile.hero.hpTotal {"total":300}')).toBeTruthy();
    expect(screen.getByLabelText("AC")).toHaveTextContent("17");
    expect(screen.getByLabelText("characterProfile.hero.toHit")).toHaveTextContent("+13");
    expect(screen.getByLabelText("characterProfile.hero.proficiency")).toHaveTextContent("+9");
    expect(screen.getByLabelText("gameTerms.stats.initiative")).toHaveTextContent("4");
    expect(screen.getByLabelText("gameTerms.stats.initiative")).not.toHaveTextContent("+4");
  });

  it("бойова вкладка: ініціатива без знака", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} initialTab="combat" />);

    expect(screen.getByText("gameTerms.stats.initiative").parentElement).toHaveTextContent(/^gameTerms\.stats\.initiative4$/);
  });

  it("таба з URL; перемикання пише ?tab= без запиту на сервер", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} initialTab="magic" />);

    const replaceState = vi.spyOn(window.history, "replaceState");

    expect(screen.getByRole("tab", { name: "characterProfile.tabs.magic" })).toHaveAttribute("data-state", "active");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "characterProfile.tabs.items" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", expect.stringMatching(/\?tab=items$/));
    expect(screen.getByRole("tab", { name: "characterProfile.tabs.items" })).toHaveAttribute("data-state", "active");
    expect(h.replace).not.toHaveBeenCalled();
  });

  it("зміна initialTab (перехід за посиланням тосту) перемикає вкладку", () => {
    const ui = (tab: string) => (
      <ConfirmProvider>
        <CharacterProfile campaignId="c" characterId="ch" canEdit={false} initialTab={tab} />
      </ConfirmProvider>
    );

    const { rerender } = render(ui("combat"));

    expect(screen.getByRole("tab", { name: "characterProfile.tabs.combat" })).toHaveAttribute("data-state", "active");

    rerender(ui("items"));

    expect(screen.getByRole("tab", { name: "characterProfile.tabs.items" })).toHaveAttribute("data-state", "active");
  });

  it("старе ?tab=stash відкриває «Інвентар»; вкладки «Підсумок» немає", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} initialTab="stash" />);

    expect(screen.getByRole("tab", { name: "characterProfile.tabs.items" })).toHaveAttribute("data-state", "active");
    expect(screen.queryByRole("tab", { name: "characterProfile.tabs.stash" })).toBeNull();
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

    expect(screen.getByText("characterProfile.combat.noAttacks")).toBeTruthy();
    expect(screen.getByLabelText("characterProfile.hero.toHit")).toHaveTextContent("—");
  });

  it("гравець не бачить «Редагувати», ДМ бачить", () => {
    const { unmount } = renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit={false} />);

    expect(screen.queryByRole("button", { name: "common.actions.edit" })).toBeNull();
    unmount();
    h.sheetQuery.data = withSheet({ viewer: { isDM: true, isOwner: false } });
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit />);
    expect(screen.getByRole("button", { name: "common.actions.edit" })).toBeTruthy();
  });

  it("гравець, що відкрив сторінку ДМа для свого персонажа, не бачить «Редагувати»", () => {
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit />);

    expect(screen.queryByRole("button", { name: "common.actions.edit" })).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: "common.actions.edit" }));
    expect(await screen.findByRole("tab", { name: "common.tabs.basic" })).toHaveAttribute("data-state", "active");
    expect(h.editorMounts).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "common.actions.save" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "common.actions.cancel" }));
    expect(screen.getByRole("button", { name: "common.actions.edit" })).toBeTruthy();
  });

  it("«Магія» в редакторі показує книгу заклинань з листа", async () => {
    mockMatchMedia(false);
    renderWithConfirm(<CharacterProfile campaignId="c" characterId="ch" canEdit />);

    fireEvent.click(screen.getByRole("button", { name: "common.actions.edit" }));
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "characterProfile.tabs.magic" }));
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.magic.book" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName("characterProfile.spellBook.title");
    expect(screen.getByText("Мітка мисливця")).toBeTruthy();
  });
});
