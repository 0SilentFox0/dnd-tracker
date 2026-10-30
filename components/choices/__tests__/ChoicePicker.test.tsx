// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChoicePicker, type PickerContext } from "@/components/choices/ChoicePicker";
import { alert, asi, featsById, scores, sorcerer, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";
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

  it("long choice description: only the summary line is inline, the full text opens from the info button", () => {
    const rest = "Long rules text. ".repeat(100);

    const { container } = render(<Harness choice={{ ...choiceById("metamagic"), description: `Pick two options.\n\n${rest}` }} context={ctx(2)} />);

    expect(screen.getByText("Pick two options.")).toBeTruthy();
    expect(container.textContent).not.toContain("Long rules text.");
    fireEvent.click(screen.getByRole("button", { name: "choices.picker.details" }));

    expect(document.body.textContent).toContain("Long rules text.");
  });

  it("short choice description stays inline without an info button", () => {
    render(<Harness choice={{ ...choiceById("metamagic"), description: "Pick two options." }} context={ctx(2)} />);

    expect(screen.getByText("Pick two options.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "choices.picker.details" })).toBeNull();
  });

  it("options: counter, min level reason, requires reason", () => {
    render(<Harness choice={choiceById("metamagic")} context={ctx(2)} />);

    expect(screen.getByText("0 / 2")).toBeTruthy();
    expect(screen.getByText('choices.requirement.level {"need":3,"have":2}')).toBeTruthy();
    expect(screen.getByText('choices.requirement.option {"list":"Careful Spell"}')).toBeTruthy();
    expect(screen.getByText("choices.picker.unavailable")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Quickened Spell/ }));

    expect(json()).toEqual([{ id: "quickened" }]);
    expect(screen.getByRole("checkbox", { name: /Empowered Spell/ }).hasAttribute("disabled")).toBe(true);
  });

  it("ability score: +1 buttons with preview and the cap", () => {
    const choice = asi.choices[0];

    render(<Harness choice={choice} context={ctx(4, { scores: { ...scores, charisma: 19 } })} />);

    fireEvent.click(screen.getByRole("button", { name: "+1 gameTerms.abilities.strength.label" }));
    fireEvent.click(screen.getByRole("button", { name: "+1 gameTerms.abilities.strength.label" }));

    expect(screen.getByText("15 → 17")).toBeTruthy();
    expect(json()).toEqual([{ id: "strength" }, { id: "strength" }]);

    fireEvent.click(screen.getByRole("button", { name: "−1 gameTerms.abilities.strength.label" }));
    fireEvent.click(screen.getByRole("button", { name: "+1 gameTerms.abilities.charisma.label" }));

    expect(screen.getByRole("button", { name: "+1 gameTerms.abilities.charisma.label" }).hasAttribute("disabled")).toBe(true);
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

  it("feat: a non-repeatable feat already taken in another picker is blocked here, the one picked here stays", () => {
    const choice: Choice = { id: "versatile", label: "Versatile", level: 1, count: 1, kind: "feat", featTypes: ["origin"] };

    const taken = new Map([["f-alert", 1]]);

    const { unmount } = render(<Harness choice={choice} context={ctx(1, { featCounts: taken })} />);

    expect(screen.getByRole("radio", { name: /Alert/ })).toBeDisabled();
    expect(screen.getByText(/choices.picker.featTaken/)).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Magic Initiate/ })).not.toBeDisabled();
    unmount();

    render(<Harness choice={choice} context={ctx(1, { featCounts: taken })} initial={[{ id: "f-alert" }]} />);

    expect(screen.getByRole("radio", { name: /Alert/ })).not.toBeDisabled();
  });

  it("feat: unmet ability prerequisite goes to the unavailable group with numbers, met ones get a check", () => {
    const choice = choiceById("ability-score-improvement-4");

    render(<Harness choice={choice} context={ctx(4, { scores: { ...scores, strength: 10, dexterity: 10 } })} />);

    expect(screen.getByText('choices.requirement.ability {"abilities":"gameTerms.abilities.strength.label / gameTerms.abilities.dexterity.label","need":13,"have":10}')).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Grappler/ })).toBeDisabled();
    expect(screen.getByText("choices.picker.unavailable")).toBeTruthy();
    expect(screen.getAllByText('choices.requirement.level {"need":4,"have":4}').every((el) => el.textContent?.includes("✓"))).toBe(true);
  });

  it("feat: manualText does not block and shows the DM-check line", () => {
    const manual = { ...alert, id: "f-manual", name: "Manual", prerequisite: { manualText: ["Be a spellcaster"] } };

    const choice: Choice = { id: "versatile", label: "Versatile", level: 1, count: 1, kind: "feat", featTypes: ["origin"] };

    render(<Harness choice={choice} context={ctx(1, { feats: [manual] })} />);

    expect(screen.getByRole("radio", { name: /Manual/ })).not.toBeDisabled();
    expect(screen.getByText(/choices.requirement.manual/)).toBeTruthy();
    expect(screen.queryByText("choices.picker.unavailable")).toBeNull();
  });

  it("feat: the info button opens the full description and does not change the selection", () => {
    const long = { ...alert, id: "f-long", name: "Longwinded", description: `Short line.\n\n${"Hidden rules text. ".repeat(30)}` };

    const choice: Choice = { id: "versatile", label: "Versatile", level: 1, count: 1, kind: "feat", featTypes: ["origin"] };

    const { container } = render(<Harness choice={choice} context={ctx(1, { feats: [long] })} />);

    expect(container.textContent).toContain("Short line.");
    expect(container.textContent).not.toContain("Hidden rules text.");
    fireEvent.click(screen.getByRole("button", { name: "choices.picker.details" }));

    expect(document.body.textContent).toContain("Hidden rules text.");
    expect(json()).toEqual([]);
    expect(screen.getByRole("radio", { name: /Longwinded/, hidden: true }).getAttribute("aria-checked")).toBe("false");
  });

  it("feat: types filter, nested choices of the picked feat", () => {
    render(<Harness choice={choiceById("ability-score-improvement-4")} context={ctx(4)} />);

    expect(screen.queryByRole("radio", { name: /Archery/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Ability Score Improvement/ }));
    fireEvent.click(screen.getByRole("button", { name: "+1 gameTerms.abilities.dexterity.label" }));

    expect(json()).toEqual([{ id: "f-asi", picks: { asi: [{ id: "dexterity" }] } }]);
  });
});
