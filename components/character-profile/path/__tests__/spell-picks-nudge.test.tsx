// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";

import { SpellPicksNudge } from "@/components/character-profile/path";
import { makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";
import { buildClassProgression } from "@/lib/utils/characters/classes/progression";
import type { CharacterSheet } from "@/types/characters";

const current = vi.hoisted(() => ({ sheet: null as unknown as CharacterSheet }));

vi.mock("@/components/character-profile/ProfileContext", () => ({ useProfile: () => ({ campaignId: "c1", characterId: "h1", sheet: current.sheet, canEdit: true }) }));
vi.mock("next/dynamic", () => ({ default: () => (props: { open: boolean }) => (props.open ? <div data-testid="choices-dialog" /> : null) }));

const caster = makeClass({
  id: "cleric",
  features: [{ level: 1, abilities: [], choices: [{ id: "cantrips", label: "Cantrips", level: 1, count: 2, kind: "spell", spells: { lists: ["Cleric"], minLevel: 0, maxLevel: 0 } }] }],
});

const sheetWith = (canEdit: boolean, picks = {}): CharacterSheet => ({
  ...sheetFixture,
  classProgression: [buildClassProgression(caster, { classId: "cleric", level: 1, choices: picks })],
  choices: { pending: 2, canEdit, lineage: null, feats: [], options: [], spellSources: {}, expertise: [] },
});

describe("SpellPicksNudge", () => {
  afterEach(cleanup);

  it("renders nothing when no spell pick is open", () => {
    current.sheet = sheetWith(true, { cantrips: [{ id: "a" }, { id: "b" }] });

    const { container } = render(<SpellPicksNudge />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says how many spells are missing and opens the choices dialog", () => {
    current.sheet = sheetWith(true);
    render(<SpellPicksNudge />);

    expect(screen.getByText('characterProfile.path.spellNudge {"count":2}')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "characterProfile.path.spellNudgeAction" }));

    expect(screen.getByTestId("choices-dialog")).toBeTruthy();
  });

  it("without edit rights keeps the text but offers no button", () => {
    current.sheet = sheetWith(false);
    render(<SpellPicksNudge />);

    expect(screen.getByText('characterProfile.path.spellNudge {"count":2}')).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
