// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "./sheet-fixture";

import { FeatsBlock } from "@/components/character-profile/FeatsBlock";
import { PendingChoicesBadge } from "@/components/character-profile/PendingChoicesBadge";
import type { CharacterSheet } from "@/types/characters";

const current = vi.hoisted(() => ({ sheet: null as unknown as CharacterSheet }));

vi.mock("@/components/character-profile/ProfileContext", () => ({ useProfile: () => ({ campaignId: "c1", characterId: "h1", sheet: current.sheet, canEdit: true }) }));
vi.mock("next/dynamic", () => ({ default: () => (props: { open: boolean }) => (props.open ? <div data-testid="choices-dialog" /> : null) }));

const choices: NonNullable<CharacterSheet["choices"]> = {
  pending: 2,
  canEdit: true,
  lineage: "Wood Elf",
  feats: [{ key: "k", id: "f-asi", name: "Ability Score Improvement", type: "general", from: { message: "characterProfile.sheet.from.classLevel", params: { name: "Rogue", level: 4 } }, picks: [{ message: "characterProfile.sheet.abilityPick", params: { n: 2, ability: "dexterity" } }] }],
  options: [{ owner: "Sorcerer", label: "Metamagic", names: ["Quickened Spell", "Twinned Spell"] }],
  spellSources: {},
  expertise: ["stealth"],
};

describe("sheet choices UI", () => {
  afterEach(cleanup);

  it("no choices → nothing rendered", () => {
    current.sheet = sheetFixture;

    const { container } = render(
      <>
        <FeatsBlock />
        <PendingChoicesBadge />
      </>,
    );

    expect(container.textContent).toBe("");
  });

  it("feats with source and picks, class options, pending badge opens the dialog", () => {
    current.sheet = { ...sheetFixture, choices };

    render(
      <>
        <FeatsBlock />
        <PendingChoicesBadge />
      </>,
    );

    expect(screen.getByText("Ability Score Improvement")).toBeTruthy();
    expect(screen.getByText(/from\.classLevel \{"name":"Rogue","level":4\} · characterProfile\.sheet\.abilityPick/)).toBeTruthy();
    expect(screen.getByText("Metamagic: Quickened Spell, Twinned Spell")).toBeTruthy();
    expect(screen.getByText('characterProfile.choices.pending {"pending":2}')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.choices.pick" }));

    expect(screen.getByTestId("choices-dialog")).toBeTruthy();
  });

  it("the pick button is hidden when the viewer cannot edit choices", () => {
    current.sheet = { ...sheetFixture, choices: { ...choices, canEdit: false } };

    render(<PendingChoicesBadge />);

    expect(screen.queryByRole("button", { name: "characterProfile.choices.pick" })).toBeNull();
  });
});

it("shows background and manual equipment even without a feat", () => {
  current.sheet = { ...sheetFixture, choices: { ...choices, feats: [], options: [], background: { id: "b", name: "Sage", picks: [{ message: "characterProfile.sheet.abilityPick", params: { n: 2, ability: "intelligence" } }], equipmentText: "Book or 50 GP" } } };
  render(<FeatsBlock />);
  expect(screen.getByText(/Sage/)).toBeTruthy();
  expect(screen.getByText(/characterProfile\.sheet\.abilityPick/)).toBeTruthy();
  expect(screen.getByText(/Book or 50 GP/)).toBeTruthy();
});
