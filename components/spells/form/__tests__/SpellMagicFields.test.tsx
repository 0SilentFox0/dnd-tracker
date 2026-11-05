// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getDefaultSpellFormData, resolutionKeysOf, spellCostKeysOf,type SpellFormData } from "@/components/spells/form/spell-form-defaults";
import { SpellFormBasicFields } from "@/components/spells/form/SpellFormBasicFields";
import { SpellFormPowerFields } from "@/components/spells/form/SpellFormPowerFields";
import { SpellMagicFields } from "@/components/spells/form/SpellMagicFields";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: () => {} });

const conditions = [{ key: "stunned", maxLevel: null, endTest: null, timed: true, label: "cond.stunned" }, { key: "bleeding", maxLevel: 5, endTest: null, timed: true, label: "cond.bleeding" }];

const seen: SpellFormData[] = [];

const last = () => seen[seen.length - 1];

function Harness({ initial, children }: { initial: SpellFormData; children: (p: { formData: SpellFormData; setFormData: (d: SpellFormData) => void }) => React.ReactNode }) {
  const [data, setData] = useState(initial);

  const setFormData = (next: SpellFormData) => {
    seen.push(next);
    setData(next);
  };

  return <>{children({ formData: data, setFormData })}</>;
}

afterEach(() => {
  cleanup();
  seen.length = 0;
});

describe("SpellMagicFields", () => {
  it("initialises magic defaults and forces auto resolution", () => {
    render(<Harness initial={{ ...getDefaultSpellFormData(), resolution: { kind: "attack" } }}>{(p) => <SpellMagicFields {...p} conditions={conditions} />}</Harness>);

    expect(last().casting?.magic).toEqual({ cn: 0, kind: "arcane", overcast: null });
    expect(last().resolution).toEqual({ kind: "auto" });
  });

  it("commits CN into casting.magic", () => {
    render(<Harness initial={getDefaultSpellFormData()}>{(p) => <SpellMagicFields {...p} conditions={conditions} />}</Harness>);

    const input = screen.getByLabelText("wfrpMagic.ui.editor.cn");

    fireEvent.change(input, { target: { value: "7" } });
    fireEvent.blur(input);

    expect(last().casting?.magic?.cn).toBe(7);
  });

  it("magic power tab offers only auto resolution", () => {
    render(<Harness initial={getDefaultSpellFormData()}>{(p) => <SpellFormPowerFields {...p} magic={{ conditions }} />}</Harness>);

    expect(screen.getByLabelText("wfrpMagic.ui.editor.cn")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "spellEditor.power.check" })).toHaveTextContent("spellEditor.power.resolution.auto");
    expect(resolutionKeysOf(true)).toEqual(["auto"]);
    expect(resolutionKeysOf(false)).toEqual(["auto", "save", "attack"]);
  });

  it("d20 power tab has no magic block", () => {
    render(<Harness initial={getDefaultSpellFormData()}>{(p) => <SpellFormPowerFields {...p} />}</Harness>);

    expect(screen.queryByLabelText("wfrpMagic.ui.editor.cn")).toBeNull();
    expect(screen.queryByLabelText("wfrpMagic.ui.editor.cn")).toBeNull();
  });

  it("magic hides the level select and the long cost; d20 keeps both", () => {
    render(<Harness initial={getDefaultSpellFormData()}>{(p) => <SpellFormBasicFields {...p} spellGroups={[]} magic />}</Harness>);
    expect(screen.queryByText("spellEditor.basic.level")).toBeNull();
    expect(spellCostKeysOf(true)).not.toContain("long");

    cleanup();
    render(<Harness initial={getDefaultSpellFormData()}>{(p) => <SpellFormBasicFields {...p} spellGroups={[]} />}</Harness>);
    expect(screen.getByText("spellEditor.basic.level")).toBeTruthy();
    expect(spellCostKeysOf(false)).toContain("long");
  });
});
