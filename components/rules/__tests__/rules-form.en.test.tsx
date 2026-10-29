// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RulesForm } from "../RulesForm";

import "@/components/ui/__tests__/match-media";

vi.unmock("next-intl");

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { DEFAULT_RULES } from "@/lib/utils/rules";

vi.mock("@/lib/hooks/campaigns/useCampaignRules", () => ({
  useCampaignRules: () => ({ data: DEFAULT_RULES, isLoading: false }),
  useUpdateCampaignRules: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("RulesForm (en)", () => {
  afterEach(cleanup);

  it("renders the morale section in English without raw keys", async () => {
    await renderWithIntl(
      <ConfirmProvider>
        <RulesForm campaignId="c1" />
      </ConfirmProvider>,
      { locale: "en", namespaces: ["common", "validation", "rules"] },
    );

    expect(screen.getByLabelText("Cap ±N")).toBeTruthy();
    expect(screen.getAllByRole("switch", { name: "Enabled" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(screen.getByText(/Changes apply to new battles/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/rules\./);
  });
});
