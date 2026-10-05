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
      <AbilityListEditor campaignId="c1" value={value} onChange={setValue} issues={issues} onValidityChange={onValid} />
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

    fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
    fireEvent.click(screen.getByText("Бонус шкоди"));

    expect(json()).toHaveLength(1);
    expect(screen.getAllByText(/шкода \(ближня\) \+10%/).length).toBeGreaterThan(0);
  });

  it("зміна тригера на пасивку з DOT → помилка і onValidityChange(false)", async () => {
    const onValid = vi.fn();

    render(<Harness initial={[{ id: "a1", name: "Кровотеча", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }]} onValid={onValid} />);

    fireEvent.click(screen.getByText("Кровотеча"));
    fireEvent.pointerDown(screen.getByLabelText("Подія"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "Пасивно (завжди)" }));

    await waitFor(() => expect(onValid).toHaveBeenLastCalledWith(false));
    expect(screen.getAllByText(/Пасивка допускає/).length).toBeGreaterThan(0);
  });

  it("видалення вміння", () => {
    render(<Harness initial={[{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Видалити вміння Лють" }));

    expect(json()).toEqual([]);
  });

  it("плашка втрат конвертера", () => {
    render(<Harness issues={[{ severity: "loss", message: "weird: невідомий стат" }]} />);

    expect(screen.getByText(/Перенесено зі старого формату/)).toBeInTheDocument();
    expect(screen.getByText("weird: невідомий стат")).toBeInTheDocument();
  });

  it("скопіювати двічі → унікальні id", async () => {
    render(<Harness />);

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
      fireEvent.click(screen.getByText("Скопіювати з…"));
      fireEvent.click(await within(screen.getByRole("dialog")).findByRole("button", { name: "Лють" }));
      await waitFor(() => expect(json()).toHaveLength(i + 1));
    }

    expect(new Set(json().map((a) => a.id)).size).toBe(2);
  });

  it("зламаний ефект: картка «Невідомий ефект» з помилкою, зберегти не можна", async () => {
    const onValid = vi.fn();

    const broken = { id: "a1", name: "Зламане", trigger: { event: "passive" }, effects: [{ kind: "teleport" }] } as unknown as Ability;

    render(<Harness initial={[broken]} onValid={onValid} />);
    fireEvent.click(screen.getByText("Зламане"));

    expect(screen.getByText("Невідомий ефект")).toBeInTheDocument();
    expect(screen.getByTestId("effect-errors-0.effects.0")).toBeInTheDocument();
    await waitFor(() => expect(onValid).toHaveBeenLastCalledWith(false));
  });

  it("порожня назва — помилка біля поля назви", () => {
    render(<Harness initial={[{ id: "a1", name: "Х", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }]} />);
    fireEvent.click(screen.getByText("Х"));
    fireEvent.change(screen.getByLabelText("Назва"), { target: { value: "" } });

    expect(screen.getByTestId("field-errors-0.name")).toBeInTheDocument();
  });
});
