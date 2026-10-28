// @vitest-environment happy-dom
import { NextResponse } from "next/server";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorldPage from "../page";

import { viewHandler } from "@/lib/server/world/view-handlers";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../page-client", () => ({ WorldPageClient: ({ mapId }: { mapId: string | null }) => <div data-testid="client">{String(mapId)}</div> }));
vi.mock("@/lib/providers/prefetched-query", () => ({ PrefetchedQuery: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/server/campaigns/access", () => ({ requireCampaignMember: vi.fn(async () => ({ campaign: { name: "C" }, isDM: false })) }));
vi.mock("@/lib/server/world/view-handlers", () => ({ viewHandler: vi.fn() }));

const props = { params: Promise.resolve({ id: "c1" }), searchParams: Promise.resolve({}) };

const json = (status: number, body: unknown = {}) => NextResponse.json(body, { status });

afterEach(cleanup);

describe("WorldPage", () => {
  it("404 (no map) renders the client for its empty state", async () => {
    vi.mocked(viewHandler).mockResolvedValue(json(404));

    render(await WorldPage(props));

    expect(screen.getByTestId("client").textContent).toBe("null");
  });

  it("other error statuses render an error state", async () => {
    vi.mocked(viewHandler).mockResolvedValue(json(500));

    render(await WorldPage(props));

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByTestId("client")).toBeNull();
  });

  it("ok view passes the map id", async () => {
    vi.mocked(viewHandler).mockResolvedValue(json(200, { map: { id: "m1" } }));

    render(await WorldPage(props));

    expect(screen.getByTestId("client").textContent).toBe("m1");
  });
});
