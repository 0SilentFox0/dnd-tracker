import type { ReactElement } from "react";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { scenarioKeys } from "@/lib/hooks/scenario/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";

const mocks = vi.hoisted(() => ({ listScenarioHandler: vi.fn(), getScenarioPageHandler: vi.fn(), loadPlayedSections: vi.fn(), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/app/api/campaigns/[id]/scenario/scenario-handlers", () => ({ listScenarioHandler: mocks.listScenarioHandler }));
vi.mock("@/app/api/campaigns/[id]/scenario/[pageId]/page-handlers", () => ({ getScenarioPageHandler: mocks.getScenarioPageHandler }));
vi.mock("@/lib/server/campaigns/access", () => ({ requireCampaignDM: vi.fn(async () => ({ campaign: { name: "Кампанія" } })) }));
vi.mock("@/lib/ai/crypto", () => ({ isAiConfigured: () => true }));
vi.mock("@/lib/server/scenario/page-store", () => ({ loadPlayedSections: mocks.loadPlayedSections }));
vi.mock("../page-client", () => ({ ScenarioIndexPageClient: () => null }));
vi.mock("../[pageId]/page-client", () => ({ ScenarioPageClient: () => null }));

import DMScenarioPageRoute from "../[pageId]/page";
import DMScenarioPage from "../page";

type Seeded = ReactElement<{ queryKey: unknown; data: unknown; children: ReactElement<Record<string, unknown>> }>;

beforeEach(() => vi.clearAllMocks());

describe("DM scenario pages (server)", () => {
  it("зміст: список із GET-обробника лягає в кеш", async () => {
    const list = [{ id: "p1" }];

    mocks.listScenarioHandler.mockResolvedValue(NextResponse.json(list));

    const el = (await DMScenarioPage({ params: Promise.resolve({ id: "c1" }) })) as Seeded;

    expect(el.type).toBe(PrefetchedQuery);
    expect(el.props.queryKey).toEqual(scenarioKeys.list("c1"));
    expect(el.props.data).toEqual(list);
    expect(el.props.children.props).toMatchObject({ campaignId: "c1", campaignName: "Кампанія" });
  });

  it("сторінка: тіло обробника в кеші, зіграні розділи цільових сторінок підвантажені", async () => {
    const page = { id: "p1", content: { legend: [], sections: [{ id: "s", title: "s", played: false, rows: [], reveal: { mode: "afterSection", pageId: "p9", sectionId: "x" } }] } };

    mocks.getScenarioPageHandler.mockResolvedValue(NextResponse.json(page));
    mocks.loadPlayedSections.mockResolvedValue([{ id: "p9", played: ["x"] }]);

    const el = (await DMScenarioPageRoute({ params: Promise.resolve({ id: "c1", pageId: "p1" }) })) as Seeded;

    expect(el.props.queryKey).toEqual(scenarioKeys.page("c1", "p1"));
    expect(el.props.data).toEqual(page);
    expect(mocks.loadPlayedSections).toHaveBeenCalledWith("c1", ["p9"]);
    expect(el.props.children.props).toMatchObject({ campaignId: "c1", pageId: "p1", playedPages: [{ id: "p9", played: ["x"] }], aiEnabled: true });
  });

  it("404 від обробника → notFound()", async () => {
    mocks.getScenarioPageHandler.mockResolvedValue(NextResponse.json({ error: "x" }, { status: 404 }));

    await expect(DMScenarioPageRoute({ params: Promise.resolve({ id: "c1", pageId: "p1" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("500 (битий контент): без кешу, клієнт сам покаже помилку", async () => {
    mocks.getScenarioPageHandler.mockResolvedValue(NextResponse.json({ error: "x" }, { status: 500 }));

    const el = (await DMScenarioPageRoute({ params: Promise.resolve({ id: "c1", pageId: "p1" }) })) as Seeded;

    expect(el.props.data).toBeNull();
    expect(mocks.loadPlayedSections).not.toHaveBeenCalled();
  });
});
