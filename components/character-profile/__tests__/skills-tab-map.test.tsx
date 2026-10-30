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
vi.mock("@/components/character-profile/ClassLevelUpDialog", () => ({ ClassLevelUpDialog: (p: { startNew?: boolean }) => <div data-testid="class-level-up-dialog" data-start-new={String(!!p.startNew)} /> }));
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

  describe("multiclass sections", () => {
    const wiz = (id: string) => makeClass({ id, name: id, color: null, features: [] });

    const sheetWith = (classes: ReturnType<typeof buildClassProgression>[]) => ({ ...sheetFixture, classProgression: classes, choices: { pending: 0, canEdit: true, lineage: null, feats: [], options: [], spellSources: {}, expertise: [] } });

    it("two classes stay open, three quiet ones collapse, the one with open picks stays open", () => {
      const quiet = (id: string) => buildClassProgression(wiz(id), { classId: id, level: 3 });

      current.sheet = sheetWith([quiet("a"), quiet("b")]);

      const { container, unmount } = render(<SkillsTab />);

      expect(Array.from(container.querySelectorAll("section > details")).map((d) => (d as HTMLDetailsElement).open)).toEqual([true, true]);
      unmount();

      current.sheet = sheetWith([quiet("a"), quiet("b"), quiet("c")]);

      const three = render(<SkillsTab />);

      expect(Array.from(three.container.querySelectorAll("section > details")).map((d) => (d as HTMLDetailsElement).open)).toEqual([false, false, false]);
      three.unmount();

      current.sheet = sheetWith([quiet("a"), quiet("b"), buildClassProgression(cls, { classId: "f", level: 4 })]);

      const waiting = render(<SkillsTab />);

      expect(Array.from(waiting.container.querySelectorAll("section > details")).map((d) => (d as HTMLDetailsElement).open)).toEqual([false, false, true]);
    });

    it("the add-class button exists only with classLevelUp and opens the dialog on the new-class choice", () => {
      current.sheet = sheetWith([buildClassProgression(cls, { classId: "f", level: 4 })]);

      const view = render(<SkillsTab />);

      expect(screen.queryByRole("button", { name: /addClass/ })).toBeNull();
      view.unmount();

      const classLevelUp = { character: { campaignId: "c1", id: "h1", entries: [{ classId: "f", level: 4 }] }, onLeveled: vi.fn() };

      render(<SkillsTab manage classLevelUp={classLevelUp} />);
      fireEvent.click(screen.getByRole("button", { name: /addClass/ }));

      expect(screen.getByTestId("class-level-up-dialog").dataset.startNew).toBe("true");
    });
  });
});
