// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactForm } from "@/components/artifacts/ArtifactForm";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ArtifactSlot } from "@/lib/constants/artifacts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("ArtifactForm", () => {
  afterEach(cleanup);

  it("шле abilities і не шле старі поля бонусів", async () => {
    const onSubmit = vi.fn<(p: unknown) => Promise<void>>(async () => {});

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
        <ArtifactForm
          campaignId="c1"
          artifactSets={[]}
          mode="create"
          title="Новий артефакт"
          submitLabel="Створити"
          submitLabelSaving="..."
          cancelHref="/x"
          iconHint=""
          initial={{ name: "Меч", description: "", rarity: "", slot: "weapon", icon: "", setId: "", abilities: [{ id: "a1", name: "Гострота", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: 2 }] }], abilityIssues: [] }}
          onSubmit={onSubmit}
        />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());

    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;

    expect(payload.abilities).toHaveLength(1);
    expect(payload).not.toHaveProperty("bonuses");
    expect(payload).not.toHaveProperty("modifiers");
    expect(payload).not.toHaveProperty("passiveAbility");
  });

  it("для зброї шле weapon з кубиками й бонусом атаки", async () => {
    const onSubmit = vi.fn<(p: unknown) => Promise<void>>(async () => {});

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
        <ArtifactForm
          campaignId="c1"
          artifactSets={[]}
          mode="edit"
          title="Меч"
          submitLabel="Зберегти"
          submitLabelSaving="..."
          cancelHref="/x"
          iconHint=""
          initial={{ name: "Меч", description: "", rarity: "", slot: "weapon", icon: "", setId: "", abilities: [], abilityIssues: [], weapon: { damageDice: "1d8" } }}
          onSubmit={onSubmit}
        />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Кубики шкоди"), { target: { value: "2d8" } });
    fireEvent.change(screen.getByLabelText("Тип шкоди"), { target: { value: "fire" } });
    fireEvent.change(screen.getByLabelText("Бонус атаки"), { target: { value: "-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect((onSubmit.mock.calls[0][0] as { weapon: unknown }).weapon).toEqual({ damageDice: "2d8", damageType: "fire", attackBonus: -1 });
  });

  it("кнопка збереження показує кількість помилок у вміннях", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
        <ArtifactForm
          campaignId="c1"
          artifactSets={[]}
          mode="create"
          title="Новий"
          submitLabel="Створити"
          submitLabelSaving="..."
          cancelHref="/x"
          iconHint=""
          initial={{ name: "Меч", description: "", rarity: "", slot: "ring", icon: "", setId: "", abilities: [{ id: "a1", name: "", trigger: { event: "passive" }, effects: [] }], abilityIssues: [] }}
          onSubmit={vi.fn(async () => {})}
        />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    const button = await screen.findByRole("button", { name: /Створити \(помилок у вміннях: \d+\)/ });

    expect(button).toBeDisabled();
  });

  it("кнопки форми — у панелі дій, «Створити» остання", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
          <ArtifactForm campaignId="c1" artifactSets={[]} mode="create" title="Новий" submitLabel="Створити" submitLabelSaving="..." cancelHref="/x" iconHint="" initial={{ name: "Меч", description: "", rarity: "", slot: "ring", icon: "", setId: "", abilities: [], abilityIssues: [] }} onSubmit={vi.fn(async () => {})} />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    const bar = document.querySelector("[data-slot=action-bar]") as HTMLElement;

    expect(bar).not.toBeNull();
    expect(bar.lastElementChild).toHaveTextContent("Створити");
  });

  it("помилка видалення показується в діалозі підтвердження, діалог лишається", async () => {
    const onDelete = vi.fn(async () => {
      throw new Error("Артефакт екіпіровано");
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
          <ArtifactForm campaignId="c1" artifactSets={[]} mode="edit" title="Ред." submitLabel="Зберегти" submitLabelSaving="..." cancelHref="/x" iconHint="" initial={{ name: "Меч", description: "", rarity: "", slot: "ring", icon: "", setId: "", abilities: [], abilityIssues: [] }} onSubmit={vi.fn(async () => {})} onDelete={onDelete} />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));

    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Видалити" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Артефакт екіпіровано");
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("слот змінено зі зброї при відкритому табі «Зброя» → активний таб «Основне»", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
          <ArtifactForm campaignId="c1" artifactSets={[]} mode="create" title="Новий" submitLabel="Створити" submitLabelSaving="..." cancelHref="/x" iconHint="" initial={{ name: "Меч", description: "", rarity: "", slot: "weapon", icon: "", setId: "", abilities: [], abilityIssues: [] }} onSubmit={vi.fn(async () => {})} />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Зброя" }));
    expect(screen.getByRole("tab", { name: "Зброя" })).toHaveAttribute("data-state", "active");

    const slotSelect = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((el) => el.value === "weapon");

    fireEvent.change(slotSelect as HTMLSelectElement, { target: { value: ArtifactSlot.RING } });

    expect(screen.queryByRole("tab", { name: "Зброя" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Основне" })).toHaveAttribute("data-state", "active");

    fireEvent.change(Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((el) => el.value === ArtifactSlot.RING) as HTMLSelectElement, { target: { value: "weapon" } });

    expect(screen.getByRole("tab", { name: "Зброя" })).toHaveAttribute("data-state", "inactive");
    expect(screen.getByRole("tab", { name: "Основне" })).toHaveAttribute("data-state", "active");
  });
});
