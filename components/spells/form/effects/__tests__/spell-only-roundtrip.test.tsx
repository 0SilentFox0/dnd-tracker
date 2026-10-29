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
import { SPELL_ONLY_FIXTURES as FIXTURES } from "./spell-only-fixtures";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { SPELL_ONLY_EDITORS } from "@/components/spells/form/effects/spell-only-editors";
import { SPELL_ONLY_EFFECT_KINDS, type SpellEffect, SpellEffectSchema } from "@/lib/utils/spells/model/schema";

function renderCard(effect: SpellEffect) {
  const onChange = vi.fn();

  const { container } = render(
    <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath: {} }}>
      <SpellEffectCard effect={effect} path="effects.0" actions={{ onChange, onRemove: vi.fn() }} />
    </AbilityEditorProvider>,
  );

  return { onChange, container };
}

describe("spell-only editors round-trip", () => {
  afterEach(cleanup);

  it("every spell-only kind has an editor and a fixture", () => {
    for (const kind of SPELL_ONLY_EFFECT_KINDS) {
      expect(SPELL_ONLY_EDITORS[kind], kind).toBeDefined();
      expect(FIXTURES[kind], kind).toBeDefined();
    }
  });

  it("an unknown kind still falls back to the generic card", () => {
    renderCard({ kind: "nonsense" } as never);

    expect(screen.queryByTestId("spell-only-nonsense")).toBeNull();
  });

  for (const [kind, { effect, edit }] of Object.entries(FIXTURES)) {
    describe(kind, () => {
      it("fixture passes the schema", () => {
        expect(SpellEffectSchema.safeParse(effect).success).toBe(true);
      });

      it("renders without calling onChange or showing errors", () => {
        const { onChange, container } = renderCard(effect as SpellEffect);

        expect(onChange).not.toHaveBeenCalled();
        expect(container.querySelector("[role=alert]")).toBeNull();
      });

      if (edit) {
        it("one edit keeps every other field", () => {
          const { onChange, container } = renderCard(effect as SpellEffect);

          const input = container.querySelector(`[id="effects.0.${edit.id}"]`);

          expect(input, edit.id).not.toBeNull();

          fireEvent.change(input!, { target: { value: edit.value } });

          const next = onChange.mock.calls.at(-1)![0];

          expect(SpellEffectSchema.safeParse(next).success).toBe(true);
          expect(next).toEqual({ ...effect, ...edit.patch });
        });
      }
    });
  }
});
