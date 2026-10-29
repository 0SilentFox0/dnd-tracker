// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

vi.mock("@/lib/hooks/notifications", () => ({ useSeenOnOpen: () => new Set<string>(), useNotifications: () => ({ data: undefined }) }));
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters/useStash", async (orig) => ({
  ...(await orig<object>()),
  useStash: () => ({ data: { purse: { gp: 0, sp: 0, cp: 0 }, items: [], artifacts: [] }, isPending: false, isError: false }),
  useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useInventoryLog: () => ({ data: { pages: [] }, isPending: false }),
  useFreeArtifacts: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/characters", async (orig) => ({
  ...(await orig<object>()),
  useCharacterRoster: () => ({ data: [], isLoading: false }), useTransferArtifact: () => ({ mutateAsync: vi.fn(), isPending: false }), useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: false } } }) }));
vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [] }) }));
vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => <div>прокачка</div> }));

import { InventoryTab, MagicTab, SkillsTab } from "@/components/character-profile";
import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";

const inProfile = (ui: ReactNode, sheet: CharacterSheet = sheetFixture) =>
  renderWithConfirm(<ProfileContext.Provider value={{ campaignId: "c", characterId: "ch", sheet, canEdit: false }}>{ui}</ProfileContext.Provider>);

describe("таби профілю", () => {
  afterEach(cleanup);

  it("Магія: слоти «I · 4», кнопка книги відкриває шторку", () => {
    mockMatchMedia(false);
    inProfile(<MagicTab />);

    expect(screen.getByLabelText('characterProfile.magic.slotsTotal {"level":"I","count":4}')).toHaveTextContent("I · 4");
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.magic.book" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("characterProfile.spellBook.title");
    expect(screen.getByText("Мітка мисливця")).toBeTruthy();
  });

  it("Магія без заклинань — порожня книга з написом, без кнопки книги", () => {
    inProfile(<MagicTab />, withSheet({ magic: null, slots: [], spells: [] }));

    expect(screen.getByText("characterProfile.magic.emptyBook")).toBeTruthy();
    expect(screen.queryByText("Магії поки немає")).toBeNull();
    expect(screen.queryByRole("button", { name: "characterProfile.magic.book" })).toBeNull();
  });

  it("Магія без заклинань, але зі слотами — слоти над порожньою книгою", () => {
    inProfile(<MagicTab />, withSheet({ spells: [] }));

    const slot = screen.getByLabelText('characterProfile.magic.slotsTotal {"level":"I","count":4}');

    const book = screen.getByText("characterProfile.magic.emptyBook");

    expect(slot.compareDocumentPosition(book) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("Інвентар: деталі артефакта з ефектами; тап — шторка", () => {
    mockMatchMedia(true);
    inProfile(<InventoryTab />);

    fireEvent.click(screen.getByRole("button", { name: "Броня: Кольчуга ельфів" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Кольчуга ельфів");
    expect(screen.getByText("AC +2")).toBeTruthy();
    expect(screen.getByText("Легка і тиха.")).toBeTruthy();
  });

  it("Вміння: персональне вміння і прокачка", () => {
    inProfile(<SkillsTab />, withSheet({ personalSkill: { id: "s", name: "Око яструба", icon: null, description: "Бачить далеко" } }));

    expect(screen.getByText("Око яструба")).toBeTruthy();
    expect(screen.getByText("прокачка")).toBeTruthy();
  });

  it("Вміння: іконка персонального вміння — аватар героя", () => {
    inProfile(<SkillsTab />, withSheet({ identity: { ...sheetFixture.identity, avatar: "/heroes/lira.png" }, personalSkill: { id: "s", name: "Око яструба", icon: null, description: null } }));

    expect(screen.getByRole("img", { name: "Ліра" }).getAttribute("src")).toContain("lira.png");
  });

  it("Інвентар: однакові ефекти показуються обидва у панелі деталей", () => {
    mockMatchMedia(false);

    const twin = { ...sheetFixture.items.artifacts[0], effects: ["AC +1", "AC +1"] };

    inProfile(<InventoryTab />, withSheet({ items: { ...sheetFixture.items, grid: { armor: twin }, artifacts: [twin] } }));
    fireEvent.click(screen.getByRole("button", { name: "Броня: Кольчуга ельфів" }));
    expect(screen.getAllByRole("listitem").filter((li) => li.textContent === "AC +1")).toHaveLength(2);
  });
});
