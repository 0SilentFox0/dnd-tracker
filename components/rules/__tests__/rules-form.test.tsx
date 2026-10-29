// @vitest-environment happy-dom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RulesForm } from "../RulesForm";

import "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const mutateAsync = vi.fn().mockResolvedValue(DEFAULT_RULES);

vi.mock("@/lib/hooks/campaigns/useRemoveCustomCondition", () => ({ useRemoveCustomCondition: () => ({ remove: vi.fn(), isPending: false, usage: null, closeUsage: vi.fn() }) }));

vi.mock("@/lib/hooks/campaigns/useRemoveCustomCondition", () => ({ useRemoveCustomCondition: () => ({ remove: vi.fn(), isPending: false, usage: null, closeUsage: vi.fn() }) }));

vi.mock("@/lib/hooks/campaigns/useCampaignRules", () => ({
  useCampaignRules: () => ({ data: DEFAULT_RULES, isLoading: false }),
  useUpdateCampaignRules: () => ({ mutateAsync, isPending: false }),
}));

describe("RulesForm", () => {
  it("disabling morale locks the cap and saves only the morale section", async () => {
    renderWithConfirm(<RulesForm campaignId="c1" />);

    expect(screen.getByLabelText("rules.sections.morale.cap")).not.toBeDisabled();

    fireEvent.click(screen.getByRole("switch", { name: "rules.sections.morale.enabled" }));

    expect(screen.getByLabelText("rules.sections.morale.cap")).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "common.actions.save" }));

    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ morale: { enabled: false, cap: 3 } }));
  });
});
