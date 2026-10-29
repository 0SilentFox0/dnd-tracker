// @vitest-environment happy-dom
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardGroups } from "@/components/campaigns/dashboard/DashboardGroups";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/notifications", () => ({ useNotifications: vi.fn(() => ({ data: undefined })) }));

afterEach(cleanup);

describe("DashboardGroups en", () => {
  it("renders English groups, tiles and finds sections by English keywords without raw keys", async () => {
    await renderWithIntl(<DashboardGroups campaignId="c1" isDM pendingDrafts={2} />, { locale: "en", namespaces: ["common", "validation", "dashboard"] });

    expect(screen.getByRole("heading", { name: "Libraries" })).toBeInTheDocument();
    expect(screen.getByText(/2 awaiting approval/)).toBeInTheDocument();

    act(() => {
      fireEvent.change(screen.getByLabelText("Search sections"), { target: { value: "mobs" } });
    });

    expect(await screen.findByText("Units")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/dashboard\./);
  });
});
