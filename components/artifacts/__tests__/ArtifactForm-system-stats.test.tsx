// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactForm } from "@/components/artifacts/ArtifactForm";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const state = vi.hoisted(() => ({ system: "wfrp" }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { system: { key: state.system }, classes: { enabled: false }, items: { enabled: false } } }) }));

vi.mock("@/components/systems", () => ({
  systemUiOf: (key: string) =>
    key === "wfrp"
      ? {
          ArtifactStatsEditor: ({ onChange, onValidityChange, slot }: { onChange: (v: unknown) => void; onValidityChange?: (v: boolean) => void; slot: string }) => (
            <div>
              <span>editor:{slot}</span>
              <button type="button" onClick={() => onChange({ type: "gear", weight: 1, price: 2, qualities: [] })}>
                set-stats
              </button>
              <button type="button" onClick={() => onValidityChange?.(false)}>
                make-invalid
              </button>
            </div>
          ),
        }
      : {},
}));

afterEach(cleanup);

const mount = (onSubmit = vi.fn<(p: unknown) => Promise<void>>(async () => {})) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConfirmProvider>
        <ArtifactForm campaignId="c1" artifactSets={[]} mode="create" labels={{ title: "New", submit: "Create", saving: "...", iconHint: "" }} cancelHref="/x" initial={{ name: "Gambeson", description: "", rarity: "", slot: "armor", icon: "", setId: "", abilities: [], abilityIssues: [] }} actions={{ onSubmit }} />
      </ConfirmProvider>
    </QueryClientProvider>,
  );

  return onSubmit;
};

describe("ArtifactForm system stats slot", () => {
  it("renders the editor tab for a system with an editor and submits systemStats", async () => {
    state.system = "wfrp";

    const onSubmit = mount();

    fireEvent.click(screen.getByRole("tab", { name: "artifacts.form.tabs.stats" }));

    expect(screen.getByText("editor:armor")).toBeTruthy();

    fireEvent.click(screen.getByText("set-stats"));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());

    expect((onSubmit.mock.calls[0][0] as { systemStats: unknown }).systemStats).toEqual({ type: "gear", weight: 1, price: 2, qualities: [] });
  });

  it("blocks submit while the editor reports invalid stats", () => {
    state.system = "wfrp";

    mount();

    fireEvent.click(screen.getByRole("tab", { name: "artifacts.form.tabs.stats" }));
    fireEvent.click(screen.getByText("make-invalid"));

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("renders no stats tab for a d20 system", () => {
    state.system = "dnd5e";

    mount();

    expect(screen.queryByRole("tab", { name: "artifacts.form.tabs.stats" })).toBeNull();
  });
});
