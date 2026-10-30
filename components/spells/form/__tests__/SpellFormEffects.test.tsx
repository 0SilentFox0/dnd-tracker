// @vitest-environment happy-dom
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDefaultSpellFormData, type SpellFormData } from "@/components/spells/form/spell-form-defaults";
import { SpellFormEffects } from "@/components/spells/form/SpellFormEffects";
import { newEffect } from "@/lib/utils/abilities/editor";
import { SPELL_EFFECT_TRIGGER } from "@/lib/utils/spells/editor/spell-only";

vi.mock("@/lib/api/abilities", () => ({ getAbilitySources: vi.fn(async () => ({ sources: [] })), getOwnerAbilities: vi.fn(async () => ({ abilities: [] })) }));
vi.mock("@/lib/hooks/races", () => ({ useRaces: () => ({ data: [] }) }));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: () => {} });

let latest: SpellFormData;

function Harness({ initial }: { initial: SpellFormData }) {
  const [formData, setData] = useState(initial);

  const setFormData = (next: SpellFormData) => {
    latest = next;
    setData(next);
  };

  return (
    <QueryClientProvider client={new QueryClient()}>
      <SpellFormEffects campaignId="c1" formData={formData} setFormData={setFormData} />
    </QueryClientProvider>
  );
}

const effect = () => newEffect("dealDamage", SPELL_EFFECT_TRIGGER);

const base = (over: Partial<SpellFormData> = {}) => ({ ...getDefaultSpellFormData(), ...over });

function openMenu() {
  const trigger = screen.getByRole("button", { name: "spellEditor.effects.add" });

  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
}

const recipeLabel = (id: string) => `abilityRegistry.templates.${id}.label`;

function pickRecipe(id: string) {
  openMenu();
  fireEvent.click(screen.getByText("spellEditor.effects.addFromRecipe"));
  fireEvent.click(screen.getByText(recipeLabel(id)));
  fireEvent.click(screen.getByRole("button", { name: "abilities.templates.create" }));
}

describe("SpellFormEffects", () => {
  afterEach(cleanup);

  it("from recipe appends effects, keeps existing ones and closes the gallery", () => {
    render(<Harness initial={base({ spellEffects: [effect()] })} />);

    pickRecipe("healSpell");

    expect(latest.spellEffects.length).toBeGreaterThan(1);
    expect(latest.spellEffects[0]).toEqual(effect());
    expect(latest.spellEffects.at(-1)?.kind).toBe("heal");
    expect(screen.queryByText("abilities.templates.addTitle")).toBeNull();
  });

  it("gallery has no copy-from button", () => {
    render(<Harness initial={base()} />);
    openMenu();
    fireEvent.click(screen.getByText("spellEditor.effects.addFromRecipe"));

    expect(screen.queryByText("abilities.templates.copyFrom")).toBeNull();
  });

  it("concentrationBuff turns concentration on", () => {
    render(<Harness initial={base({ concentration: false })} />);

    pickRecipe("concentrationBuff");

    expect(latest.concentration).toBe(true);
  });

  it("damageSpell leaves concentration untouched", () => {
    render(<Harness initial={base({ concentration: true })} />);

    pickRecipe("damageSpell");

    expect(latest.concentration).toBe(true);
  });

  it("empty effect adds exactly one", () => {
    render(<Harness initial={base({ spellEffects: [] })} />);
    openMenu();
    fireEvent.click(screen.getByText("spellEditor.effects.addEmpty"));

    expect(latest.spellEffects).toHaveLength(1);
  });

  it("collapse hides cards and shows the summary", () => {
    render(<Harness initial={base({ spellEffects: [effect(), effect()] })} />);

    expect(screen.getByRole("button", { name: "spellEditor.effects.add" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /abilities.panel.collapse|spellEditor.effects.title/ }));

    expect(screen.queryByRole("button", { name: "spellEditor.effects.add" })).toBeNull();
    expect(screen.getByText(/spellEditor\.effects\.summary.*2/)).toBeInTheDocument();
  });

  it("a validation error in an effect reopens the section", () => {
    const invalid = { ...effect(), amount: "bad" } as never;

    const view = (data: SpellFormData) => (
      <QueryClientProvider client={new QueryClient()}>
        <SpellFormEffects campaignId="c1" formData={data} setFormData={() => {}} />
      </QueryClientProvider>
    );

    const { rerender } = render(view(base({ spellEffects: [effect()] })));

    fireEvent.click(screen.getByRole("button", { name: /abilities.panel.collapse|spellEditor.effects.title/ }));
    expect(screen.queryByRole("button", { name: "spellEditor.effects.add" })).toBeNull();

    rerender(view(base({ spellEffects: [invalid] })));

    expect(screen.getByRole("button", { name: "spellEditor.effects.add" })).toBeInTheDocument();
  });
});
