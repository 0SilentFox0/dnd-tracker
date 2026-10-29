// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/units", () => ({ useUnits: vi.fn(() => ({ data: [{ id: "u1", name: "Вовк" }], isLoading: false })) }));

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

import { SpellEffectCard } from "../SpellEffectCard";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { newSpellOnlyEffect } from "@/lib/utils/spells/editor/spell-only";
import { type SpellEffect, SpellEffectSchema } from "@/lib/utils/spells/model/schema";

function renderCard(effect: SpellEffect, errorsByPath: Record<string, string[]> = {}) {
  const onChange = vi.fn();

  render(
    <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath }}>
      <SpellEffectCard effect={effect} path="effects.0" actions={{ onChange, onRemove: vi.fn() }} />
    </AbilityEditorProvider>,
  );

  return onChange;
}

const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)![0] as SpellEffect;

describe("SpellEffectCard", () => {
  afterEach(cleanup);

  it("chooseOne renders nested cards and edits an option into a valid effect", () => {
    const onChange = renderCard(newSpellOnlyEffect("chooseOne"));

    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(3);

    fireEvent.change(screen.getByLabelText("abilityRegistry.effects.heal.fields.amount"), { target: { value: "5" } });

    expect(SpellEffectSchema.safeParse(lastCall(onChange)).success).toBe(true);
  });

  it("chooseOne cannot drop below two options", () => {
    renderCard(newSpellOnlyEffect("chooseOne"));

    const removes = screen.getAllByLabelText("abilities.effect.delete");

    expect(removes.filter((b) => (b as HTMLButtonElement).disabled)).toHaveLength(2);
  });

  it("createTerrain: changing shape", () => {
    const onChange = renderCard(newSpellOnlyEffect("createTerrain"));

    fireEvent.change(screen.getByLabelText("editors.spellEffects.fields.createTerrain.shape"), { target: { value: "line" } });

    expect(lastCall(onChange)).toMatchObject({ kind: "createTerrain", shape: "line" });
  });

  it("transform: picking a unit writes unitId", () => {
    const onChange = renderCard(newSpellOnlyEffect("transform"));

    fireEvent.change(screen.getByLabelText("editors.spellEffects.fields.transform.unitId"), { target: { value: "u1" } });

    expect(lastCall(onChange)).toMatchObject({ kind: "transform", unitId: "u1", revertAtZero: true });
  });

  it("field errors by path show next to the field", () => {
    renderCard(newSpellOnlyEffect("inputDice"), { "effects.0.max": ["validation.min"] });

    expect(screen.getByTestId("field-errors-effects.0.max")).toBeInTheDocument();
  });

  it("a base dealDamage card renders as before", () => {
    renderCard({ kind: "dealDamage", amount: 5 });

    expect(screen.getByLabelText("abilityRegistry.effects.dealDamage.fields.amount")).toBeInTheDocument();
  });

  it("switching the kind to inputDice yields the default", () => {
    const onChange = renderCard({ kind: "dealDamage", amount: 5 });

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "inputDice" } });

    expect(lastCall(onChange)).toEqual(newSpellOnlyEffect("inputDice"));
  });
});
