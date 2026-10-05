// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactForm } from "@/components/artifacts/ArtifactForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("ArtifactForm", () => {
  afterEach(cleanup);

  it("шле abilities і не шле старі поля бонусів", async () => {
    const onSubmit = vi.fn<(p: unknown) => Promise<void>>(async () => {});

    render(
      <QueryClientProvider client={new QueryClient()}>
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
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Кубики шкоди"), { target: { value: "2d8" } });
    fireEvent.change(screen.getByLabelText("Тип шкоди"), { target: { value: "fire" } });
    fireEvent.change(screen.getByLabelText("Бонус атаки"), { target: { value: "-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect((onSubmit.mock.calls[0][0] as { weapon: unknown }).weapon).toEqual({ damageDice: "2d8", damageType: "fire", attackBonus: -1 });
  });
});
