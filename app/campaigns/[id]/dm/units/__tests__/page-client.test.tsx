// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DMUnitsPageClient } from "@/app/campaigns/[id]/dm/units/page-client";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("DM units list", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } }))));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("порожній список — EmptyState із заголовком", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ConfirmProvider>
          <DMUnitsPageClient campaignId="c1" initialUnits={[]} />
        </ConfirmProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Ще немає юнітів")).toBeInTheDocument();
  });
});
