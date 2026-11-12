// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RulesForm } from "../RulesForm";

import "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const mocks = vi.hoisted(() => ({ system: { key: "dnd5e" } as { key: string; modules?: string[] } }));

vi.mock("@/lib/hooks/campaigns/useRemoveCustomCondition", () => ({ useRemoveCustomCondition: () => ({ remove: vi.fn(), isPending: false, usage: null, closeUsage: vi.fn() }) }));
vi.mock("@/lib/hooks/campaigns/useCampaignRules", () => ({
  useCampaignRules: () => ({ data: { ...DEFAULT_RULES, actions: { ...DEFAULT_RULES.actions, enabled: true }, system: mocks.system }, isLoading: false }),
  useUpdateCampaignRules: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

afterEach(cleanup);

const tab = (key: string) => screen.queryByRole("tab", { name: `rules.mechanics.${key}.label` });

describe("RulesForm tabs follow the composition sections", () => {
  it("homm preset: module sections are tabs", () => {
    mocks.system = { key: "homm" };
    renderWithConfirm(<RulesForm campaignId="c1" />);

    expect(tab("morale")).toBeTruthy();
    expect(tab("heroScaling")).toBeTruthy();
    expect(tab("criticals")).toBeTruthy();
  });

  it("without the morale and heroscaling modules those tabs disappear", () => {
    mocks.system = { key: "dnd5e", modules: [] };
    renderWithConfirm(<RulesForm campaignId="c1" />);

    expect(tab("morale")).toBeNull();
    expect(tab("heroScaling")).toBeNull();
    expect(tab("criticals")).toBeTruthy();
  });

  it("the retaliation switch needs the retaliation module", () => {
    mocks.system = { key: "dnd5e", modules: ["retaliation"] };
    renderWithConfirm(<RulesForm campaignId="c1" />);

    fireEvent.mouseDown(tab("actions") as HTMLElement, { button: 0 });
    fireEvent.click(tab("actions") as HTMLElement);

    expect(screen.getByRole("switch", { name: "rules.sections.actions.retaliation" })).toBeTruthy();

    cleanup();
    mocks.system = { key: "dnd5e", modules: [] };
    renderWithConfirm(<RulesForm campaignId="c1" />);
    fireEvent.mouseDown(tab("actions") as HTMLElement, { button: 0 });
    fireEvent.click(tab("actions") as HTMLElement);

    expect(screen.queryByRole("switch", { name: "rules.sections.actions.retaliation" })).toBeNull();
  });

  it("wfrp shows no d20 tabs", () => {
    mocks.system = { key: "wfrp" };
    renderWithConfirm(<RulesForm campaignId="c1" />);

    expect(tab("criticals")).toBeNull();
    expect(tab("tables")).toBeTruthy();
  });
});
