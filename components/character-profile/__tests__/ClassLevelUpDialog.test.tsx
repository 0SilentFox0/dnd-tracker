// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassLevelUpDialog } from "@/components/character-profile/ClassLevelUpDialog";
import { makeAbility, makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";
import type { GameClassData } from "@/types/classes";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ "aria-label": label, value, onValueChange, options = [] }: { "aria-label"?: string; value: string; onValueChange: (v: string) => void; options?: { value: string; label: string; disabled?: boolean }[] }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/character-profile/LevelUpChoicesStep", () => ({ LevelUpChoicesStep: () => null }));

vi.mock("@/lib/hooks/classes", () => ({ useClasses: () => ({ data: classes }) }));

const submit = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/hooks/characters/useClassLevelUp", () => ({
  useClassLevelUp: () => ({ submit, isPending: false, error: null, clearError: vi.fn() }),
}));

let classes: GameClassData[] = [];

const fighter = makeClass({
  name: "Воїн",
  color: null,
  features: [{ level: 5, abilities: [makeAbility("ea", "Extra Attack", "x")] }],
  subclassLevel: 3,
  subclasses: [{ id: "champion", name: "Чемпіон", features: [] }],
});

const renderDialog = (level: number, entry: Record<string, unknown> = {}, hero = false, extra: { startNew?: boolean; scores?: Record<string, number> } = {}) =>
  render(
    <ClassLevelUpDialog
      open
      startNew={extra.startNew}
      onOpenChange={vi.fn()}
      character={{ campaignId: "c1", id: "h1", entries: [{ classId: "fighter", level, ...entry }], ...(hero && { hero: { race: "human", level, scores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, ...extra.scores }, skills: {} } }) }}
    />,
  );

describe("ClassLevelUpDialog", () => {
  beforeEach(() => {
    classes = [fighter];
  });

  afterEach(() => {
    cleanup();
    submit.mockClear();
  });

  it("підсумок рівня: назви фіч і кількість виборів, порожній рівень без блоку", () => {
    renderDialog(4);

    expect(screen.getByText('characterProfile.classLevelUp.gains {"level":5}')).toBeTruthy();
    expect(screen.getByText("Extra Attack")).toBeTruthy();
    cleanup();
    renderDialog(5);

    expect(screen.queryByText(/characterProfile\.classLevelUp\.gains /)).toBeNull();
  });

  it("підклас обов'язковий, коли новий рівень досягає subclassLevel", async () => {
    renderDialog(2);

    expect(screen.getByText("Воїн 2 → 3")).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "characterProfile.classLevelUp.subclass" })).toBeTruthy();
    fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement);
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: /Чемпіон/ }));
    fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: "fighter", subclassId: "champion" }));
  });

  it("без підкласу до subclassLevel викликає мутацію з classId", async () => {
    renderDialog(1);

    expect(screen.queryByRole("radiogroup", { name: "characterProfile.classLevelUp.subclass" })).toBeNull();
    fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: "fighter" }));
  });

  it("перелічує фічі обраного підкласу на новому рівні", () => {
    classes = [{ ...fighter, subclasses: [{ id: "champion", name: "Чемпіон", features: [{ level: 5, abilities: [makeAbility("sc", "Superior Crit", "x")] }] }] }];
    renderDialog(4, { subclassId: "champion" });

    expect(screen.getByText("Extra Attack, Superior Crit")).toBeTruthy();
  });

  it("лічильник виборів береться з кроків вибору (масштабований вибір)", () => {
    const col = { key: "prep", label: "Prepared", values: Array.from({ length: 20 }, (_, i) => (i + 1 >= 5 ? "4" : "")) };

    classes = [{ ...fighter, columns: [col], features: [{ level: 5, abilities: [], choices: [{ id: "prep", label: "Prepared", level: 5, count: { scale: "prep" }, kind: "spell" }] }] } as GameClassData];
    renderDialog(4, {}, true);

    expect(screen.getByText('characterProfile.classLevelUp.picks {"count":1}')).toBeTruthy();
  });

  describe("multiclass reasons", () => {
    const wizard = makeClass({ id: "wizard", name: "Wizard", color: null });

    const barbarian = makeClass({ id: "barbarian", name: "Barbarian", color: null });

    beforeEach(() => {
      classes = [{ ...fighter, name: "Fighter" }, wizard, barbarian];
    });

    const newClassSelect = () => screen.getByRole("combobox") as HTMLSelectElement;

    it("startNew opens on the new-class choice", () => {
      renderDialog(5, {}, true, { startNew: true, scores: { strength: 13 } });

      expect(newClassSelect()).toBeTruthy();
    });

    it("an unmet requirement disables the class option, a met one stays enabled", () => {
      renderDialog(5, {}, true, { startNew: true, scores: { strength: 13, intelligence: 10 } });

      const options = Array.from(newClassSelect().options);

      expect(options.find((o) => o.value === "wizard")?.disabled).toBe(true);
      expect(options.find((o) => o.value === "barbarian")?.disabled).toBe(false);
    });

    it("without hero data nothing is disabled", () => {
      renderDialog(5, {}, false, { startNew: true });

      expect(Array.from(newClassSelect().options).some((o) => o.disabled)).toBe(false);
    });

    it("a blocked class picked programmatically shows the shortfall under the select", () => {
      renderDialog(5, {}, true, { startNew: true, scores: { strength: 13, intelligence: 10 } });
      fireEvent.change(newClassSelect(), { target: { value: "wizard" } });

      expect(screen.getByRole("listitem").textContent).toMatch(/Wizard: choices\.requirement\.ability .*"need":13,"have":10/);
    });
  });
});
