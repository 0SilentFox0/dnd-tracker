// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import type { Choice, ChoiceOwner } from "@/types/choices";

vi.mock("@/components/abilities", () => ({ AbilityListEditor: ({ value }: { value: unknown[] }) => <div data-testid="ability-editor">{value.length}</div> }));
vi.mock("@/lib/hooks/spells", () => ({ useSpells: () => ({ data: [{ id: "sp1", name: "Druidcraft", level: 0 }] }) }));

function Harness({ owner, initial = [] }: { owner: ChoiceOwner; initial?: Choice[] }) {
  const [value, setValue] = useState<Choice[]>(initial);

  return (
    <>
      <ChoiceListEditor campaignId="c1" owner={owner} value={value} onChange={setValue} classColumns={[{ key: "metamagic", label: "Metamagic", values: Array(20).fill("2") }]} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "[]") as Choice[];

describe("ChoiceListEditor", () => {
  afterEach(cleanup);

  it("edits the grant policy of a spell choice", () => {
    render(<Harness owner="class" initial={[{ id: "signature", label: "Signature", level: 20, count: 2, kind: "spell", spells: { lists: ["Wizard"], minLevel: 3, maxLevel: 3 } }]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "choices.grant.freeCast" }));
    expect(json()[0].grant).toMatchObject({ uses: 1, rest: "long", via: "grant" });
    fireEvent.change(screen.getByLabelText("choices.grant.restAria"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("choices.grant.circleAria"), { target: { value: "3" } });
    expect(json()[0].grant).toMatchObject({ rest: "short", castLevel: 3 });
  });

  it("adds a choice and switches its kind", () => {
    render(<Harness owner="class" />);

    fireEvent.click(screen.getByRole("button", { name: "choices.list.add" }));
    fireEvent.change(screen.getByLabelText("choices.header.kind"), { target: { value: "abilityScore" } });

    expect(json()[0]).toMatchObject({ kind: "abilityScore", points: 2, max: 20 });
  });

  it("class: count from a table column; race: lineage; feat: no nested feat kind", () => {
    render(<Harness owner="class" initial={[{ id: "m", label: "Metamagic", level: 2, count: 1, kind: "option", options: [] }]} />);

    fireEvent.change(screen.getByLabelText("choices.list.scale"), { target: { value: "metamagic" } });

    expect(json()[0].count).toEqual({ scale: "metamagic" });

    cleanup();
    render(<Harness owner="race" initial={[{ id: "l", label: "Lineage", level: 1, count: 1, kind: "option", options: [] }]} />);

    fireEvent.click(screen.getByLabelText("choices.list.lineage"));

    expect(json()[0].lineage).toBe(true);

    cleanup();
    render(<Harness owner="feat" initial={[{ id: "s", label: "S", level: 1, count: 1, kind: "skill" }]} />);

    expect(Array.from(screen.getByLabelText("choices.header.kind").querySelectorAll("option")).map((o) => o.getAttribute("value"))).not.toContain("feat");
    expect(screen.queryByLabelText("choices.header.level")).toBeNull();
  });

  it("options: add, name gives the id, race options take spells", () => {
    render(<Harness owner="race" initial={[{ id: "l", label: "Lineage", level: 1, count: 1, kind: "option", options: [] }]} />);

    fireEvent.click(screen.getByRole("button", { name: "choices.options.add" }));
    fireEvent.change(screen.getByLabelText("choices.options.name"), { target: { value: "Wood Elf" } });
    fireEvent.click(screen.getByRole("button", { name: "choices.optionSpells.add" }));

    expect(json()[0].options?.[0]).toMatchObject({ id: "wood-elf", name: "Wood Elf", spells: [{ level: 1, spellId: "sp1" }] });
    expect(screen.getAllByTestId("ability-editor")).toHaveLength(1);
  });

  it("removes a choice", () => {
    render(<Harness owner="class" initial={[{ id: "a", label: "A", level: 1, count: 1, kind: "skill" }]} />);

    fireEvent.click(screen.getByRole("button", { name: 'choices.header.remove {"label":"A"}' }));

    expect(json()).toEqual([]);
  });
});
