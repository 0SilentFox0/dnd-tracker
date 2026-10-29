// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioIndex } from "@/components/scenario";
import { render } from "@/components/ui/__tests__/uk-intl";
import type { ScenarioPageSummary } from "@/types/scenario";

afterEach(cleanup);

vi.unmock("next-intl");

const page = (over: Partial<ScenarioPageSummary>): ScenarioPageSummary => ({ id: "x", kind: "scene", arc: "Арка перша", title: "x", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 0, updatedAt: "", ...over });

describe("ScenarioIndex", () => {
  it("арки, номери, статуси, герої; стрілки викликають onMove", () => {
    const onMove = vi.fn();

    render(
      <ScenarioIndex
        campaignId="c"
        pages={[page({ id: "a", title: "Монастир Світла", status: "ready", sortOrder: 0 }), page({ id: "b", title: "Викрадення", sortOrder: 1 }), page({ id: "h", kind: "hero", title: "Годрик", status: "ready" })]}
        onMove={onMove}
      />,
    );

    expect(screen.getByText("Арка перша")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Монастир Світла" }).getAttribute("href")).toBe("/campaigns/c/dm/scenario/a");
    expect(screen.getAllByText("Готова")).toHaveLength(2);
    expect(screen.getByText("Годрик")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Вниз: Монастир Світла" }));
    expect(onMove).toHaveBeenCalledWith("a", 1, expect.any(Array));
  });
});
