// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ArtifactForm } from "@/components/artifacts/ArtifactForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("ArtifactForm", () => {
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
});
