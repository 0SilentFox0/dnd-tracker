// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/units", () => ({ useUnits: vi.fn(() => ({ data: [{ id: "u1", name: "Вовк" }, { id: "u2", name: "Ведмідь" }], isLoading: false })) }));

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, options, onValueChange }: { value: string; options: { value: string; label: string }[]; onValueChange: (v: string) => void }) => (
    <select aria-label="unit" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { UnitPickerField } from "@/components/abilities/fields/UnitPickerField";
import { useUnits } from "@/lib/hooks/units";
import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";

const meta: FieldMeta = { name: "unitId", label: "Юніт", input: "unit", optional: true };

describe("UnitPickerField", () => {
  afterEach(cleanup);

  it("показує юнітів кампанії з редактора і віддає id обраного", () => {
    const onChange = vi.fn();

    render(
      <AbilityEditorProvider value={{ campaignId: "camp", errorsByPath: {} }}>
        <UnitPickerField id="u" meta={meta} value={undefined} onChange={onChange} />
      </AbilityEditorProvider>,
    );

    expect(useUnits).toHaveBeenCalledWith("camp");
    expect(screen.getByRole("option", { name: "Вовк" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("unit"), { target: { value: "u2" } });
    expect(onChange).toHaveBeenCalledWith("u2");

    fireEvent.change(screen.getByLabelText("unit"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("поле unitId ефекту summon використовує вибір юніта, а не текст", () => {
    expect(EFFECT_REGISTRY.summon.fields.find((f) => f.name === "unitId")?.input).toBe("unit");
  });
});
