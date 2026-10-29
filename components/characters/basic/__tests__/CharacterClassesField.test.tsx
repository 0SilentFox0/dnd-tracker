// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterClassesField } from "@/components/characters/basic/CharacterClassesField";
import type { GameClassData } from "@/types/classes";

const base: Omit<GameClassData, "id" | "name" | "hitDie" | "subclassLevel"> = {
  icon: null,
  color: null,
  savingThrows: [],
  proficiencies: { armor: [], weapons: [], tools: [] },
  skillChoices: { count: 2, from: ["Атлетика", "Залякування"] },
  caster: "none",
  spellcastingAbility: null,
  features: [],
  subclasses: [{ id: "champion", name: "Чемпіон", features: [] }],
};

const fighter: GameClassData = { ...base, id: "fighter", name: "Воїн", hitDie: 10, subclassLevel: 3 };

const wizard: GameClassData = { ...base, id: "wizard", name: "Чарівник", hitDie: 6, subclassLevel: 2, skillChoices: { count: 2, from: ["Магія"] } };

const renderField = (value: { classId: string; level: number; subclassId?: string | null }[]) =>
  render(<CharacterClassesField value={value} classes={[fighter, wizard]} onChange={vi.fn()} />);

describe("CharacterClassesField", () => {
  afterEach(cleanup);

  it("підклас вимкнений до subclassLevel і вмикається з нього", () => {
    const { rerender } = renderField([{ classId: "fighter", level: 2 }]);

    expect((screen.getByRole("combobox", { name: `characters.form.classes.subclassN {"n":1}` }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(`characters.form.classes.fromLevel {"level":3}`)).toBeTruthy();
    rerender(<CharacterClassesField value={[{ classId: "fighter", level: 3 }]} classes={[fighter, wizard]} onChange={vi.fn()} />);
    expect((screen.getByRole("combobox", { name: `characters.form.classes.subclassN {"n":1}` }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("показує загальний рівень, кістки хітів і підказку навичок першого класу", () => {
    renderField([
      { classId: "fighter", level: 5 },
      { classId: "wizard", level: 2 },
    ]);

    expect(screen.getByText(`characters.form.classes.totalLevel {"level":7}`)).toBeTruthy();
    expect(screen.getByText(`characters.form.classes.hitDice {"dice":"5d10 + 2d6"}`)).toBeTruthy();
    expect(screen.getByText(`characters.form.classes.skillChoice {"count":2,"from":"Атлетика, Залякування"}`)).toBeTruthy();
  });

  it("невідомий клас — підказка", () => {
    renderField([{ classId: "gone", level: 1 }]);

    expect(screen.getByText("characters.form.classes.notFound")).toBeTruthy();
  });

  it("вже використаний клас не пропонується в іншому рядку", () => {
    renderField([
      { classId: "fighter", level: 1 },
      { classId: "wizard", level: 1 },
    ]);

    fireEvent.click(screen.getByRole("combobox", { name: `characters.form.classes.classN {"n":2}` }));

    expect(screen.queryByRole("option", { name: "Воїн" })).toBeNull();
    expect(screen.getAllByRole("option", { name: "Чарівник" }).length).toBeGreaterThan(0);
  });

  it("класи довантажилися після першого рендера — onChange не пише порожній classId", () => {
    const onChange = vi.fn();

    const value = [
      { classId: "fighter", level: 3, subclassId: "champion" },
      { classId: "wizard", level: 1 },
    ];

    const { rerender } = render(<CharacterClassesField value={value} classes={[]} onChange={onChange} />);

    rerender(<CharacterClassesField value={value} classes={[fighter, wizard]} onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText("characters.form.classes.notFound")).toBeNull();
  });

  it("невідомий клас зберігає свій classId, поки користувач не обере інший", () => {
    const onChange = vi.fn();

    render(<CharacterClassesField value={[{ classId: "gone", level: 1 }]} classes={[fighter, wizard]} onChange={onChange} />);

    expect(onChange).not.toHaveBeenCalled();
  });
});
