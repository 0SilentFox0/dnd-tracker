// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getDefaultSpellFormData, type SpellFormData } from "@/components/spells/form/spell-form-defaults";
import { SpellComponentsFields } from "@/components/spells/form/SpellComponentsFields";
import { formToPayload, spellFormIssue } from "@/lib/utils/spells/model/form";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: () => {} });

let latest: SpellFormData;

function Harness({ initial }: { initial: SpellFormData }) {
  const [data, setData] = useState(initial);

  return <SpellComponentsFields formData={data} setFormData={(next) => { latest = next; setData(next); }} />;
}

const base = (over: Partial<SpellFormData> = {}) => ({ ...getDefaultSpellFormData(), ...over });

afterEach(cleanup);

describe("SpellComponentsFields", () => {
  it("hides the list without M and clears ingredients when M is switched off", () => {
    render(<Harness initial={base({ componentFlags: { v: true, s: false, m: true }, ingredients: [{ name: "Ruby", qty: 1, consumed: true, focus: false }] })} />);

    expect(screen.getAllByTestId("ingredient-row")).toHaveLength(1);

    fireEvent.click(screen.getByRole("checkbox", { name: "spells.ingredients.flags.m" }));

    expect(screen.queryByTestId("ingredient-row")).toBeNull();
    expect(latest.ingredients).toEqual([]);
    expect(latest.componentFlags).toEqual({ v: true, s: false, m: false });
  });

  it("adds and removes rows, forcing M on", () => {
    render(<Harness initial={base({ componentFlags: { v: false, s: false, m: true } })} />);

    fireEvent.click(screen.getByRole("button", { name: "spells.ingredients.add" }));

    expect(screen.getAllByTestId("ingredient-row")).toHaveLength(1);
    expect(latest.componentFlags?.m).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "spells.ingredients.remove" }));

    expect(screen.queryByTestId("ingredient-row")).toBeNull();
  });

  it("flips focus automatically with value and consumption until set by hand", () => {
    render(<Harness initial={base({ componentFlags: { v: false, s: false, m: true } })} />);

    fireEvent.click(screen.getByRole("button", { name: "spells.ingredients.add" }));

    expect(latest.ingredients?.[0].focus).toBe(true);

    fireEvent.change(screen.getByLabelText("spells.ingredients.minGp"), { target: { value: "50" } });

    expect(latest.ingredients?.[0]).toMatchObject({ minGp: 50, focus: false });

    fireEvent.click(screen.getByRole("checkbox", { name: "spells.ingredients.focus" }));
    fireEvent.change(screen.getByLabelText("spells.ingredients.minGp"), { target: { value: "" } });

    expect(latest.ingredients?.[0].focus).toBe(true);
  });

  it("shows an error for a duplicate name", () => {
    const row = { name: "Ruby", qty: 1, consumed: true, focus: false };

    render(<Harness initial={base({ componentFlags: { v: false, s: false, m: true }, ingredients: [row, { ...row, name: " ruby " }] })} />);

    expect(screen.getAllByText("spells.ingredients.duplicate")).toHaveLength(1);
  });

  it("derives flags from the legacy text", () => {
    render(<Harness initial={base({ components: "V, M (dust)" })} />);

    expect(screen.getByRole("checkbox", { name: "spells.ingredients.flags.v" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "spells.ingredients.flags.s" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "spells.ingredients.flags.m" })).toBeChecked();
  });
});

describe("payload", () => {
  it("sends ingredients together with componentFlags", () => {
    const form = base({ name: "X", componentFlags: { v: true, s: true, m: true }, ingredients: [{ name: "Ruby", qty: 1, consumed: true, focus: false }], components: "V, S, M" });

    const payload = formToPayload(form);

    expect(payload.ingredients).toHaveLength(1);
    expect(payload.componentFlags).toEqual({ v: true, s: true, m: true });
    expect(payload).not.toHaveProperty("components");
  });

  it("reports duplicates and missing M as translation keys", () => {
    const row = { name: "Ruby", qty: 1, consumed: true, focus: false };

    expect(spellFormIssue(base({ name: "X", componentFlags: { v: false, s: false, m: true }, ingredients: [row, row] }))?.message).toBe("spells.ingredients.duplicate");
    expect(spellFormIssue(base({ name: "X", componentFlags: null, ingredients: [row] }))?.message).toBe("spells.ingredients.needsMaterial");
  });
});
