// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChoicePicker, type PickerContext } from "@/components/choices/ChoicePicker";
import { asi, featsById, scores, sorcerer, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { Choice, ChoicePick } from "@/types/choices";

const ctx = (level: number, extra: Partial<PickerContext> = {}): PickerContext => ({ level, totalLevel: level, columns: sorcerer.columns, maxSlotLevel: 1, feats: Object.values(featsById), featsById, spells, proficient: new Set(), scores, ...extra });

function Harness({ choice, context, initial = [] }: { choice: Choice; context: PickerContext; initial?: ChoicePick[] }) {
  const [value, setValue] = useState<ChoicePick[]>(initial);

  return (
    <>
      <ChoicePicker choice={choice} value={value} onChange={setValue} ctx={context} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "[]") as ChoicePick[];

const choiceById = (id: string) => sorcerer.features.flatMap((f) => f.choices ?? []).find((c) => c.id === id)!;

describe("ChoicePicker", () => {
  afterEach(cleanup);

  it("options: counter, min level reason, requires reason", () => {
    render(<Harness choice={choiceById("metamagic")} context={ctx(2)} />);

    expect(screen.getByText("0 / 2")).toBeTruthy();
    expect(screen.getByText('choices.picker.fromLevel {"level":3}')).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Quickened Spell/ }));

    expect(json()).toEqual([{ id: "quickened" }]);
    expect(screen.getByRole("checkbox", { name: /Empowered Spell/ }).hasAttribute("disabled")).toBe(true);
  });

  it("ability score: +1 buttons with preview and the cap", () => {
    const choice = asi.choices[0];

    render(<Harness choice={choice} context={ctx(4, { scores: { ...scores, charisma: 19 } })} />);

    fireEvent.click(screen.getByRole("button", { name: "+1 common.abilities.strength.label" }));
    fireEvent.click(screen.getByRole("button", { name: "+1 common.abilities.strength.label" }));

    expect(screen.getByText("15 → 17")).toBeTruthy();
    expect(json()).toEqual([{ id: "strength" }, { id: "strength" }]);

    fireEvent.click(screen.getByRole("button", { name: "−1 common.abilities.strength.label" }));
    fireEvent.click(screen.getByRole("button", { name: "+1 common.abilities.charisma.label" }));

    expect(screen.getByRole("button", { name: "+1 common.abilities.charisma.label" }).hasAttribute("disabled")).toBe(true);
  });

  it("ability score: saved picks already inside the scores are not counted twice", () => {
    const choice = asi.choices[0];

    render(<Harness choice={choice} context={ctx(4, { scoreAfter: scores })} initial={[{ id: "strength" }, { id: "strength" }]} />);

    expect(screen.queryByText(/→/)).toBeNull();
  });

  it("spells: only the list and circles in range, counter", () => {
    render(<Harness choice={choiceById("prepared-spells")} context={ctx(1)} />);

    expect(screen.queryByRole("checkbox", { name: /Cure Wounds/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /Fireball/ })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Magic Missile/ }));

    expect(screen.getByText("1 / 2")).toBeTruthy();
  });

  it("feat: types filter, nested choices of the picked feat", () => {
    render(<Harness choice={choiceById("ability-score-improvement-4")} context={ctx(4)} />);

    expect(screen.queryByRole("radio", { name: /Archery/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Ability Score Improvement/ }));
    fireEvent.click(screen.getByRole("button", { name: "+1 common.abilities.dexterity.label" }));

    expect(json()).toEqual([{ id: "f-asi", picks: { asi: [{ id: "dexterity" }] } }]);
  });
});
