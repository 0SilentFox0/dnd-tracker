// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DmAiPageClient } from "../page-client";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/ai", () => ({
  useAiSettings: () => ({ data: undefined, isLoading: false }),
  useApiTokens: () => ({ query: { isPending: false, isError: false, data: [] }, create: vi.fn(), revoke: vi.fn() }),
}));

describe("DmAiPageClient REST API panel", () => {
  it("template: openapi.json link and a curl example with campaignId, no raw keys", async () => {
    await renderWithIntl(<ConfirmProvider><DmAiPageClient campaignId="c1" isTemplate /></ConfirmProvider>, { locale: "en", namespaces: ["common", "validation", "ai"] });

    expect(screen.getByRole("link", { name: /openapi\.json/ })).toHaveAttribute("href", "/api/openapi.json");

    const curl = screen.getByText(/^curl/).textContent;

    expect(curl).toContain("/api/campaigns/c1/units");
    expect(curl).toContain("Authorization: Bearer <token>");
    expect(screen.getByText("Tokens for accessing the template content through the API.")).toBeInTheDocument();
  });
});
