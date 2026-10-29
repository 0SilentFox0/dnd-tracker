// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ id, value, options, onValueChange }: { id?: string; value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void }) => (
    <select id={id} value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import { ZoneTriggerEditor } from "../ZoneTriggerEditor";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { SpellEffectCard } from "@/components/spells/form/effects/SpellEffectCard";
import { newSpellOnlyEffect } from "@/lib/utils/spells/editor/spell-only";
import { type SpellEffect, SpellEffectSchema, type ZoneTrigger } from "@/lib/utils/spells/model/schema";

function Harness({ initial, onValue }: { initial: SpellEffect; onValue: (e: SpellEffect) => void }) {
  const [effect, setEffect] = useState(initial);

  return (
    <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath: {} }}>
      <SpellEffectCard
        effect={effect}
        path="effects.0"
        actions={{
          onChange: (e) => {
            setEffect(e);
            onValue(e);
          },
        }}
      />
    </AbilityEditorProvider>
  );
}

const pick = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("spell-only editors (hitRider, grantCast, anchoredZone)", () => {
  afterEach(cleanup);

  it("defaults pass the schema", () => {
    for (const kind of ["hitRider", "grantCast", "anchoredZone"] as const) expect(SpellEffectSchema.safeParse(newSpellOnlyEffect(kind)).success, kind).toBe(true);
  });

  it("grantCast: resolution save shows the ability select and stays schema-valid", () => {
    const onValue = vi.fn();

    render(<Harness initial={newSpellOnlyEffect("grantCast")} onValue={onValue} />);

    expect(screen.queryByLabelText("spellEditor.power.saveAbility")).toBeNull();

    pick("spellEditor.power.check", "save");

    expect(screen.getByLabelText("spellEditor.power.saveAbility")).toBeInTheDocument();

    const last = onValue.mock.calls.at(-1)![0] as SpellEffect;

    expect(last).toMatchObject({ kind: "grantCast", cast: { resolution: { kind: "save" } } });
    expect(SpellEffectSchema.safeParse(last).success).toBe(true);
  });

  it("grantCast: cast.effects are editable nested", () => {
    const onValue = vi.fn();

    render(<Harness initial={newSpellOnlyEffect("grantCast")} onValue={onValue} />);

    fireEvent.change(screen.getByLabelText("abilityRegistry.effects.dealDamage.fields.amount"), { target: { value: "7" } });

    const last = onValue.mock.calls.at(-1)![0] as Extract<SpellEffect, { kind: "grantCast" }>;

    expect(last.cast.effects[0]).toMatchObject({ kind: "dealDamage", amount: { spellRoll: 7 } });
    expect(SpellEffectSchema.safeParse(last).success).toBe(true);
  });

  it("hitRider: enabling the save adds one onFail effect", () => {
    const onValue = vi.fn();

    render(<Harness initial={newSpellOnlyEffect("hitRider")} onValue={onValue} />);

    fireEvent.click(screen.getByLabelText("editors.spellEffects.fields.hitRider.save"));

    const last = onValue.mock.calls.at(-1)![0] as Extract<SpellEffect, { kind: "hitRider" }>;

    expect(last.save?.onFail).toHaveLength(1);
    expect(SpellEffectSchema.safeParse(last).success).toBe(true);
  });

  it("anchoredZone: onEnter switch off removes the trigger", () => {
    const onValue = vi.fn();

    render(<Harness initial={newSpellOnlyEffect("anchoredZone")} onValue={onValue} />);

    fireEvent.click(screen.getByLabelText("editors.spellEffects.fields.anchoredZone.onEnter"));

    expect((onValue.mock.calls.at(-1)![0] as Record<string, unknown>).onEnter).toBeUndefined();
  });

  it("ZoneTriggerEditor: save to attack drops the save", () => {
    const onChange = vi.fn();

    const value: ZoneTrigger = { save: { ability: "dexterity" }, effects: [] };

    render(
      <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath: {} }}>
        <ZoneTriggerEditor value={value} onChange={onChange} path="z" label="zone" allowPull />
      </AbilityEditorProvider>,
    );

    pick("editors.spellEffects.zone.check", "attack");

    expect(onChange).toHaveBeenCalledWith({ effects: [], attack: "spell" });
  });

  it("ZoneTriggerEditor: pull is offered only with allowPull", () => {
    const render1 = (allowPull: boolean) =>
      render(
        <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath: {} }}>
          <ZoneTriggerEditor value={{ effects: [] }} onChange={vi.fn()} path="z" label="zone" allowPull={allowPull} />
        </AbilityEditorProvider>,
      );

    render1(false);

    expect(screen.queryByLabelText("editors.spellEffects.zone.pull")).toBeNull();

    cleanup();
    render1(true);

    expect(screen.getByLabelText("editors.spellEffects.zone.pull")).toBeInTheDocument();
  });
});
