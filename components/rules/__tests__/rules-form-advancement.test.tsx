// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RulesForm } from "../RulesForm";

import "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const mocks = vi.hoisted(() => ({ system: "homm" }));

vi.mock("@/lib/hooks/campaigns/useRemoveCustomCondition", () => ({ useRemoveCustomCondition: () => ({ remove: vi.fn(), isPending: false, usage: null, closeUsage: vi.fn() }) }));
vi.mock("@/lib/hooks/campaigns/useCampaignRules", () => ({
  useCampaignRules: () => ({ data: { ...DEFAULT_RULES, system: { key: mocks.system } }, isLoading: false }),
  useUpdateCampaignRules: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

afterEach(cleanup);

describe("RulesForm advancement tab", () => {
  it("is offered for wfrp only", () => {
    mocks.system = "wfrp";
    renderWithConfirm(<RulesForm campaignId="c1" />);

    expect(screen.getByRole("tab", { name: "rules.mechanics.advancement.label" })).toBeTruthy();

    cleanup();
    mocks.system = "homm";
    renderWithConfirm(<RulesForm campaignId="c1" />);

    expect(screen.queryByRole("tab", { name: "rules.mechanics.advancement.label" })).toBeNull();
  });
});
