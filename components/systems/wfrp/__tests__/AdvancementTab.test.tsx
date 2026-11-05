// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdvancementTab } from "../AdvancementTab";

import { sheetFixture } from "@/components/character-profile/__tests__/sheet-fixture";
import { ProfileProvider } from "@/components/character-profile/ProfileContext";
import { render } from "@/lib/i18n/test/render-uk";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { CharacterSheet } from "@/types/characters";
import type { FeatData } from "@/types/choices";

vi.unmock("next-intl");

const mocks = vi.hoisted(() => ({ character: { data: undefined as unknown }, feats: { data: undefined as unknown }, buy: vi.fn(), undo: vi.fn() }));

vi.mock("@/lib/hooks/characters", () => ({
  useCharacter: () => mocks.character,
  useAdvance: () => ({ buy: mocks.buy, undo: mocks.undo, isPending: false, error: null }),
}));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: DEFAULT_RULES }) }));
vi.mock("@/lib/hooks/feats", () => ({ useFeats: () => mocks.feats }));

const feat = (id: string, xpCost: number | null, maxRank: number | null): FeatData => ({ id, name: `Feat ${id}`, icon: null, type: "general", prerequisite: {}, repeatable: false, xpCost, maxRank, description: null, abilities: [], choices: [] });

const characteristics = (over: Record<string, unknown> = {}) => ({ base: {}, advances: {}, skillAdvances: {}, talents: {}, ledger: [], ...over });

const mount = ({ experience = 100, chars = {}, isDM = false }: { experience?: number; chars?: Record<string, unknown>; isDM?: boolean } = {}) => {
  mocks.character.data = { experience, characteristics: characteristics(chars) };

  const sheet = { ...sheetFixture, system: "wfrp", viewer: { isDM, isOwner: !isDM }, wfrp: { characteristics: [], skills: [{ key: "athletics", characteristic: "ag", target: 30, advances: 0, trained: false, kind: "basic" }] } } as unknown as CharacterSheet;

  return render(
    <ProfileProvider campaignId="c" characterId="ch" sheet={sheet} canEdit={false}>
      <AdvancementTab />
    </ProfileProvider>,
  );
};

const entry = (id: string, key: string, kind: "characteristic" | "talent" = "characteristic") => ({ id, at: "2026-11-05T10:00:00Z", kind, key, from: 0, to: 1, cost: 25 });

describe("AdvancementTab", () => {
  beforeEach(() => {
    mocks.feats.data = [feat("f1", 100, 2)];
  });

  afterEach(() => {
    cleanup();
    mocks.buy.mockClear();
    mocks.undo.mockClear();
  });

  it("shows the XP balance net of the ledger and the next price from the rules", () => {
    mount({ experience: 100, chars: { ledger: [entry("e1", "ws")], advances: { ws: 1 } } });

    expect(screen.getByText("75")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Купити · 25" }).length).toBeGreaterThan(0);
  });

  it("buys a characteristic with the right request", () => {
    mount({ experience: 100 });

    fireEvent.click(screen.getAllByRole("button", { name: "Купити · 25" })[0]);

    expect(mocks.buy).toHaveBeenCalledWith({ kind: "characteristic", key: "ws" });
  });

  it("disables buying when XP is short and at the limit", () => {
    mount({ experience: 5, chars: { advances: { ws: 40 } } });

    const buttons = screen.getAllByRole("button");

    expect(buttons.filter((b) => b.textContent === "Ліміт").every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(buttons.filter((b) => b.textContent === "Купити · 25").every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("prices talents per rank and buys by feat id", () => {
    mount({ experience: 500, chars: { talents: { f1: 1 } } });

    expect(screen.getByText("Ранг 1/2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Купити · 200" }));

    expect(mocks.buy).toHaveBeenCalledWith({ kind: "talent", key: "f1" });
  });

  it("renders a talent missing from the catalog as unknown", () => {
    mount({ chars: { talents: { gone: 2 } } });

    expect(screen.getAllByText("Невідомий талант").length).toBeGreaterThan(0);
    expect(screen.getByText("Ранг 2")).toBeTruthy();
  });

  it("offers undo on the last ledger entry to the DM only", () => {
    const chars = { advances: { ws: 1, bs: 1 }, ledger: [entry("e1", "ws"), entry("e2", "bs")] };

    mount({ chars, isDM: true });

    const undo = screen.getAllByRole("button", { name: "Відкотити" });

    expect(undo).toHaveLength(1);

    fireEvent.click(undo[0]);

    expect(mocks.undo).toHaveBeenCalled();

    cleanup();
    mount({ chars, isDM: false });

    expect(screen.queryByRole("button", { name: "Відкотити" })).toBeNull();
  });
});
