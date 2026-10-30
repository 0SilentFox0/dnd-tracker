// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "./sheet-fixture";

import { SkillsTab } from "@/components/character-profile/SkillsTab";
import { buildClassProgression } from "@/lib/utils/characters/classes";
import { makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";
import type { CharacterSheet } from "@/types/characters";

const current = vi.hoisted(() => ({ sheet: null as unknown as CharacterSheet }));

vi.mock("@/components/character-profile/ProfileContext", () => ({ useProfile: () => ({ campaignId: "c1", characterId: "h1", sheet: current.sheet, canEdit: true }) }));
vi.mock("next/dynamic", () => ({ default: () => (props: { open: boolean }) => (props.open ? <div data-testid="choices-dialog" /> : null) }));
vi.mock("@/components/character-profile/RacePassive", () => ({ RacePassive: () => null }));
vi.mock("@/components/character-profile/FeatsBlock", () => ({ FeatsBlock: () => null }));
vi.mock("@/components/character-profile/rest/ChargesList", () => ({ ChargesList: () => null }));
vi.mock("@/components/skill-tree/progression", () => ({ ProgressionPanel: () => <div data-testid="panel" /> }));

const cls = makeClass({
  id: "f",
  color: null,
  features: [{ level: 4, abilities: [], choices: [{ id: "asi4", label: "ASI", level: 4, count: 1, kind: "feat" }] }],
});

describe("SkillsTab class map", () => {
  afterEach(cleanup);

  it("renders the path timeline instead of the old table and opens choices on pick", () => {
    current.sheet = {
      ...sheetFixture,
      classProgression: [buildClassProgression(cls, { classId: "f", level: 4 })],
      choices: { pending: 1, canEdit: true, lineage: null, feats: [], options: [], spellSources: {}, expertise: [] },
    };
    render(<SkillsTab />);

    expect(screen.getByText("Fighter")).toBeTruthy();
    expect(screen.getByText('characterProfile.path.level {"level":4}')).toBeTruthy();
    expect(screen.queryByText("Вміння класу та підкласу")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /ASI/ })[0]);

    expect(screen.getByTestId("choices-dialog")).toBeTruthy();
  });

  it("without classProgression keeps the panel only", () => {
    current.sheet = sheetFixture;
    render(<SkillsTab />);

    expect(screen.getByTestId("panel")).toBeTruthy();
    expect(screen.queryByText("Fighter")).toBeNull();
  });
});
