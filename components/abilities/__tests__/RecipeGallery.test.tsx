// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { RecipeGallery } from "@/components/abilities/RecipeGallery";
import { RECIPES } from "@/lib/utils/abilities/templates";

vi.mock("@/lib/api/abilities", () => ({ getAbilitySources: vi.fn(async () => ({ sources: [] })), getOwnerAbilities: vi.fn(async () => ({ abilities: [] })) }));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: () => {} });

const label = (id: string) => `abilityRegistry.templates.${id}.label`;

function renderGallery(props: { scope: "ability" | "spell"; onPick: (v: never) => void; onOpenChange?: (o: boolean) => void }) {
  const view = (open: boolean) => (
    <QueryClientProvider client={new QueryClient()}>
      <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath: {} }}>
        <RecipeGallery open={open} onOpenChange={props.onOpenChange ?? (() => {})} {...(props as object as { scope: "ability"; onPick: () => void })} />
      </AbilityEditorProvider>
    </QueryClientProvider>
  );

  const r = render(view(true));

  return { ...r, rerenderOpen: (o: boolean) => r.rerender(view(o)) };
}

describe("RecipeGallery", () => {
  afterEach(cleanup);

  it("category chips filter the cards, All restores", () => {
    renderGallery({ scope: "ability", onPick: vi.fn() });

    const all = RECIPES.filter((r) => r.scopes.includes("ability"));

    expect(screen.getAllByText(/abilityRegistry\.templates\..+\.label/)).toHaveLength(all.length);

    fireEvent.click(screen.getByRole("button", { name: "abilityRegistry.templates.categories.defense" }));

    const defense = all.filter((r) => r.category === "defense");

    expect(screen.getAllByText(/abilityRegistry\.templates\..+\.label/)).toHaveLength(defense.length);
    expect(screen.queryByText(label(all.find((r) => r.category !== "defense")?.id ?? ""))).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "abilities.templates.allCategories" }));
    expect(screen.getAllByText(/abilityRegistry\.templates\..+\.label/)).toHaveLength(all.length);
  });

  it("cards show label, hint and preview", () => {
    renderGallery({ scope: "ability", onPick: vi.fn() });

    expect(screen.getByText(label("survive"))).toBeInTheDocument();
    expect(screen.getByText("abilityRegistry.templates.survive.hint")).toBeInTheDocument();
    expect(document.querySelector("[data-part]")).not.toBeNull();
  });

  it("recipe without params creates at once and closes", () => {
    const onPick = vi.fn();

    const onOpenChange = vi.fn();

    renderGallery({ scope: "ability", onPick, onOpenChange });
    fireEvent.click(screen.getByText(label("survive")));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0]).toHaveLength(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("parameter form validates dice and passes the values", () => {
    const onPick = vi.fn();

    renderGallery({ scope: "ability", onPick });
    fireEvent.click(screen.getByText(label("bonusAction")));

    expect(screen.getByLabelText("abilities.templates.nameLabel")).toHaveValue("abilityRegistry.templates.bonusAction.defaultName");

    const create = screen.getByRole("button", { name: "abilities.templates.create" });

    fireEvent.change(screen.getByLabelText("abilityRegistry.templates.bonusAction.params.dice"), { target: { value: "2d" } });
    expect(create).toBeDisabled();
    expect(screen.getByTestId("recipe-errors")).toHaveTextContent("abilities.validation.diceFormat");

    fireEvent.change(screen.getByLabelText("abilityRegistry.templates.bonusAction.params.dice"), { target: { value: "2d6" } });
    expect(create).toBeEnabled();

    fireEvent.click(create);

    expect(JSON.stringify(onPick.mock.calls[0][0])).toContain("2d6");
  });

  it("from scratch gives an empty passive ability", () => {
    const onPick = vi.fn();

    renderGallery({ scope: "ability", onPick });
    fireEvent.click(screen.getByText("abilities.templates.scratch"));

    expect(onPick.mock.calls[0][0][0]).toMatchObject({ trigger: { event: "passive" } });
  });

  it("copy from opens the source picker", () => {
    renderGallery({ scope: "ability", onPick: vi.fn() });
    fireEvent.click(screen.getByText("abilities.templates.copyFrom"));

    expect(screen.getByText("abilities.templates.copyTitle")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("abilities.copy.search")).toBeInTheDocument();
  });

  it("spell scope: only spell recipes, no scratch or copy, picks effects", () => {
    const onPick = vi.fn();

    renderGallery({ scope: "spell", onPick });

    const spell = RECIPES.filter((r) => r.scopes.includes("spell"));

    expect(screen.getAllByText(/abilityRegistry\.templates\..+\.label/)).toHaveLength(spell.length);
    expect(screen.queryByText("abilities.templates.scratch")).toBeNull();
    expect(screen.queryByText("abilities.templates.copyFrom")).toBeNull();

    fireEvent.click(screen.getByText(label(spell.find((r) => r.params.length === 0)?.id ?? "")));

    expect(onPick.mock.calls[0][0]).toMatchObject({ effects: expect.any(Array) });
  });

  it("close resets category and parameter step", () => {
    const onOpenChange = vi.fn();

    renderGallery({ scope: "ability", onPick: vi.fn(), onOpenChange });
    fireEvent.click(screen.getByRole("button", { name: "abilityRegistry.templates.categories.support" }));
    fireEvent.click(screen.getAllByText(/abilityRegistry\.templates\..+\.label/)[0]);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);

    cleanup();
    renderGallery({ scope: "ability", onPick: vi.fn() });

    expect(screen.getByText("abilities.templates.scratch")).toBeInTheDocument();
  });
});
