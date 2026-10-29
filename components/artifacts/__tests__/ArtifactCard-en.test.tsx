// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("ArtifactCard in en", () => {
  afterEach(cleanup);

  it("renders English rarity, kind, set badge and actions", async () => {
    const artifact = { id: "a1", name: "Sword", slot: "weapon", rarity: "legendary", icon: null, description: null, abilitySummary: [], itemKind: "property" as const, artifactSet: { name: "Dragon" } };

    await renderWithIntl(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
          <ArtifactCard campaignId="c1" artifact={artifact} />
        </ConfirmProvider>
      </QueryClientProvider>,
      { locale: "en", namespaces: ["common", "artifacts"] },
    );

    expect(screen.getByText("Legendary")).toBeInTheDocument();
    expect(screen.getByText("Property")).toBeInTheDocument();
    expect(screen.getByText("Set: Dragon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\p{Script=Cyrillic}|artifacts\./u);
  });
});
