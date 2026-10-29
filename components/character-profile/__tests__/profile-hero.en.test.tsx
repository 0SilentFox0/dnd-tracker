// @vitest-environment happy-dom
import type { ReactElement } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture, withSheet } from "./sheet-fixture";

vi.unmock("next-intl");
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));
vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useCharacterGoals: () => ({ save: vi.fn(), isPending: false }) }));

import { GoalList } from "@/components/character-profile/GoalList";
import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { ProfileHero } from "@/components/character-profile/ProfileHero";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { CharacterSheet } from "@/types/characters";

const inProfile = (sheet: CharacterSheet, ui: ReactElement) =>
  renderWithIntl(
    <ConfirmProvider>
      <ProfileContext.Provider value={{ campaignId: "c", characterId: "ch", sheet, canEdit: false }}>{ui}</ProfileContext.Provider>
    </ConfirmProvider>,
    { locale: "en", namespaces: ["common", "validation", "characterProfile"] },
  );

describe("character profile (en)", () => {
  afterEach(cleanup);

  it("hero chips and the hp breakdown are English without raw keys", async () => {
    const sheet = withSheet({ hp: { total: 300, lines: [{ label: "characterProfile.sheet.lines.hitDice", params: { dice: "3d10" }, value: "" }] } });

    const { container } = await inProfile(sheet, <ProfileHero />);

    fireEvent.click(screen.getByText("HP 300"));

    expect(screen.getByLabelText("Proficiency")).toBeInTheDocument();
    expect(screen.getByText("Hit dice: 3d10")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/characterProfile\./);
  });

  it("goals render English headings and kinds", async () => {
    const { container } = await inProfile(sheetFixture, <GoalList />);

    expect(screen.getByText("GOALS")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/characterProfile\./);
  });
});
