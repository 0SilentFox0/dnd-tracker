// @vitest-environment happy-dom
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityListEditor } from "@/components/abilities";
import type { Ability } from "@/lib/utils/abilities/schema";

vi.mock("@/lib/api/abilities", () => ({
  getAbilitySources: vi.fn(async () => ({ sources: [{ kind: "skill", id: "s9", name: "Лють" }] })),
  getOwnerAbilities: vi.fn(async () => ({ abilities: [{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }] })),
}));

function Harness({ initial = [] as Ability[], issues = [] as { severity: "loss" | "behavior"; message: string }[], onValid = vi.fn() }) {
  const [value, setValue] = useState<Ability[]>(initial);

  return (
    <QueryClientProvider client={new QueryClient()}>
      <AbilityListEditor campaignId="c1" value={value} onChange={setValue} issues={issues} onValidityChange={onValid} performChoices={{ attacks: [{ name: "Rend" }], spells: [{ id: "fear", name: "Страх" }] }} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </QueryClientProvider>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "[]") as Ability[];

// Radix Select relies on pointer-capture APIs that happy-dom lacks
Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: () => {} });

describe("AbilityListEditor", () => {
  afterEach(cleanup);

  it("додати з шаблону → рядок з описом", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "abilities.chips.add" }));
    fireEvent.click(screen.getByText("abilityRegistry.templates.damage.label"));

    expect(json()).toHaveLength(1);
    expect(screen.getAllByText(/abilityRegistry\.summary\.effects\.damageBonus/).length).toBeGreaterThan(0);
  });

  it("зміна тригера на пасивку з DOT → помилка і onValidityChange(false)", async () => {
    const onValid = vi.fn();

    render(<Harness initial={[{ id: "a1", name: "Кровотеча", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }]} onValid={onValid} />);

    fireEvent.click(screen.getByRole("tab", { name: /Кровотеча/ }));
    fireEvent.pointerDown(screen.getByLabelText("abilities.trigger.event"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "abilityRegistry.triggers.passive.label" }));

    await waitFor(() => expect(onValid).toHaveBeenLastCalledWith(false, expect.any(Number)));
    expect(onValid.mock.lastCall?.[1]).toBeGreaterThan(0);
    expect(screen.getAllByText(/abilities.validation.passiveEffectKinds/).length).toBeGreaterThan(0);
  });

  it("видалення вміння", () => {
    render(<Harness initial={[{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }]} />);

    fireEvent.click(screen.getByRole("button", { name: 'abilities.panel.delete {"name":"Лють"}' }));

    expect(json()).toEqual([]);
  });

  it("плашка невалідних збережених даних", () => {
    render(<Harness issues={[{ severity: "loss", message: "Частина збережених вмінь має невалідні дані" }]} />);

    expect(screen.getByText(/abilities.editor.storedInvalid/)).toBeInTheDocument();
    expect(screen.queryByText(/Перенесено зі старого формату/)).not.toBeInTheDocument();
  });

  it("скопіювати двічі → унікальні id", async () => {
    render(<Harness />);

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: "abilities.chips.add" }));
      fireEvent.click(screen.getByText("abilities.templates.copyFrom"));
      fireEvent.click(await within(screen.getByRole("dialog")).findByRole("button", { name: "Лють" }));
      await waitFor(() => expect(json()).toHaveLength(i + 1));
    }

    expect(new Set(json().map((a) => a.id)).size).toBe(2);
  });

  it("додане з шаблону вміння вибране", () => {
    render(<Harness initial={[{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }]} />);

    fireEvent.click(screen.getByRole("button", { name: "abilities.chips.add" }));
    fireEvent.click(screen.getByText("abilityRegistry.templates.damage.label"));

    const tabs = screen.getAllByRole("tab");

    expect(tabs).toHaveLength(2);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  });

  it("видалення вибраного переносить вибір на сусіда", () => {
    const note = (id: string, name: string): Ability => ({ id, name, trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] });

    render(<Harness initial={[note("a", "Перше"), note("b", "Друге"), note("c", "Трете")]} />);

    fireEvent.click(screen.getByRole("tab", { name: /Друге/ }));
    fireEvent.click(screen.getByRole("button", { name: 'abilities.panel.delete {"name":"Друге"}' }));

    expect(json().map((a) => a.id)).toEqual(["a", "c"]);
    expect(screen.getByRole("tab", { name: /Трете/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("порожній список: підказка", () => {
    render(<Harness />);

    expect(screen.getByText("abilities.editor.empty")).toBeInTheDocument();
  });

  it("зламаний ефект: картка «Невідомий ефект» з помилкою, зберегти не можна", async () => {
    const onValid = vi.fn();

    const broken = { id: "a1", name: "Зламане", trigger: { event: "passive" }, effects: [{ kind: "teleport" }] } as unknown as Ability;

    render(<Harness initial={[broken]} onValid={onValid} />);
    fireEvent.click(screen.getByRole("tab", { name: /Зламане/ }));

    expect(screen.getByText("abilities.effect.unknown")).toBeInTheDocument();
    expect(screen.getByTestId("effect-errors-0.effects.0")).toBeInTheDocument();
    await waitFor(() => expect(onValid).toHaveBeenLastCalledWith(false, expect.any(Number)));
  });

  it("порожня назва — помилка біля поля назви", () => {
    render(<Harness initial={[{ id: "a1", name: "Х", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }]} />);
    fireEvent.click(screen.getByRole("tab", { name: /Х/ }));
    fireEvent.change(screen.getByLabelText("abilities.panel.name"), { target: { value: "" } });

    expect(screen.getByTestId("field-errors-0.name")).toBeInTheDocument();
  });
});

 describe("linked action editor", () => {
  afterEach(cleanup);

  it("chooses an attack reference and lair limit", () => {
    render(<Harness initial={[{ id: "a", name: "Pounce", trigger: { event: "action" }, limits: { legendaryCost: 1 }, effects: [{ kind: "note", text: "Move" }] }]} />);
    fireEvent.change(screen.getByLabelText("abilities.perform.kindAria"), { target: { value: "attack" } });
    fireEvent.change(screen.getByLabelText("abilities.perform.attackAria"), { target: { value: "Rend" } });
    expect(json()[0].perform).toEqual({ kind: "attack", attack: "Rend" });
    fireEvent.click(screen.getByLabelText("abilities.limits.lair"));
    expect(json()[0].limits).toMatchObject({ lair: true });
    expect(json()[0].limits?.legendaryCost).toBeUndefined();
  });
});
