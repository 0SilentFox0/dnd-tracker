// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/hooks/classes", () => ({ useClasses: () => ({ data: [fighter] }) }));

const submit = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/hooks/characters", () => ({
  useClassLevelUp: () => ({ submit, isPending: false, error: null, clearError: vi.fn() }),
}));

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
  features: [],
  subclassLevel: 3,
  subclasses: [{ id: "champion", name: "Чемпіон", features: [] }],
};

const renderDialog = (level: number) =>
  render(<ClassLevelUpDialog open onOpenChange={vi.fn()} character={{ campaignId: "c1", id: "h1", entries: [{ classId: "fighter", level }] }} />);

describe("ClassLevelUpDialog", () => {
  afterEach(() => {
    cleanup();
    submit.mockClear();
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
});
