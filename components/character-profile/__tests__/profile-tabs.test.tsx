// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => <div>прокачка</div> }));

import { ItemsTab, MagicTab, SkillsTab } from "@/components/character-profile";
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

    expect(screen.getByLabelText("I коло: 4 слоти")).toHaveTextContent("I · 4");
    fireEvent.click(screen.getByRole("button", { name: "Книга заклинань" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Книга заклинань");
    expect(screen.getByText("Мітка мисливця")).toBeTruthy();
  });

  it("Магія без заклинань і слотів — порожній стан", () => {
    inProfile(<MagicTab />, withSheet({ magic: null, slots: [], spells: [] }));

    expect(screen.getByText("Магії поки немає")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Книга заклинань" })).toBeNull();
  });

  it("Речі: список по артефактах з ефектами і сетом have/total; тап — шторка", () => {
    mockMatchMedia(false);
    inProfile(<ItemsTab />);

    expect(screen.getByText("AC +2")).toBeTruthy();
    expect(screen.getByText(/«Мисливець» 2\/3/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Броня: Кольчуга ельфів" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Кольчуга ельфів");
    expect(screen.getByText("Легка і тиха.")).toBeTruthy();
  });

  it("Вміння: персональне вміння і прокачка", () => {
    inProfile(<SkillsTab />, withSheet({ personalSkill: { id: "s", name: "Око яструба", icon: null, description: "Бачить далеко" } }));

    expect(screen.getByText("Око яструба")).toBeTruthy();
    expect(screen.getByText("прокачка")).toBeTruthy();
  });
});
