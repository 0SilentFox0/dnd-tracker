// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassLevelUpDialog } from "@/components/character-profile/ClassLevelUpDialog";
import type { GameClassData } from "@/types/classes";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ "aria-label": label, value, onValueChange, options = [] }: { "aria-label"?: string; value: string; onValueChange: (v: string) => void; options?: { value: string; label: string }[] }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
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

const fighter: GameClassData = {
  id: "fighter",
  name: "Воїн",
  icon: null,
  color: null,
  hitDie: 10,
  savingThrows: [],
  proficiencies: { armor: [], weapons: [], tools: [] },
  skillChoices: { count: 0, from: [] },
  caster: "none",
  spellcastingAbility: null,
  features: [{ level: 5, abilities: [{ id: "ea", name: "Extra Attack", description: "x" } as never] }],
  subclassLevel: 3,
  subclasses: [{ id: "champion", name: "Чемпіон", features: [] }],
};

const renderDialog = (level: number, entry: Record<string, unknown> = {}, hero = false) =>
  render(
    <ClassLevelUpDialog
      open
      onOpenChange={vi.fn()}
      character={{ campaignId: "c1", id: "h1", entries: [{ classId: "fighter", level, ...entry }], ...(hero && { hero: { race: "human", level, scores: {} as never, skills: {} } }) }}
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

    expect(screen.getByText("Що дає рівень 5")).toBeTruthy();
    expect(screen.getByText("Extra Attack")).toBeTruthy();
    cleanup();
    renderDialog(5);

    expect(screen.queryByText(/Що дає рівень/)).toBeNull();
  });

  it("підклас обов'язковий, коли новий рівень досягає subclassLevel", async () => {
    renderDialog(2);

    expect(screen.getByText("Воїн 2 → 3")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Підклас" })).toBeTruthy();
    fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement);
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", { name: "Підклас" }), { target: { value: "champion" } });
    fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: "fighter", subclassId: "champion" }));
  });

  it("без підкласу до subclassLevel викликає мутацію з classId", async () => {
    renderDialog(1);

    expect(screen.queryByRole("combobox", { name: "Підклас" })).toBeNull();
    fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: "fighter" }));
  });

  it("перелічує фічі обраного підкласу на новому рівні", () => {
    classes = [{ ...fighter, subclasses: [{ id: "champion", name: "Чемпіон", features: [{ level: 5, abilities: [{ id: "sc", name: "Superior Crit", description: "x" } as never] }] }] }];
    renderDialog(4, { subclassId: "champion" });

    expect(screen.getByText("Extra Attack, Superior Crit")).toBeTruthy();
  });

  it("лічильник виборів береться з кроків вибору (масштабований вибір)", () => {
    const col = { key: "prep", label: "Prepared", values: Array.from({ length: 20 }, (_, i) => (i + 1 >= 5 ? "4" : "")) };

    classes = [{ ...fighter, columns: [col], features: [{ level: 5, abilities: [], choices: [{ id: "prep", label: "Prepared", level: 5, count: { scale: "prep" }, kind: "spell" }] }] } as GameClassData];
    renderDialog(4, {}, true);

    expect(screen.getByText("Виборів: 1")).toBeTruthy();
  });
});
