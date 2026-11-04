import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ userId: "u1", kind: "demo" }));

vi.mock("@/lib/auth", () => ({ getSessionUserId: () => Promise.resolve(mocks.userId) }));
vi.mock("@/lib/server/campaigns/access", () => ({ getCampaignForLayout: () => Promise.resolve({ kind: mocks.kind }) }));
vi.mock("@/components/onboarding/DemoTourCoordinator", () => ({
  DemoTourCoordinator: ({ children }: { children: React.ReactNode }) => <div data-testid="tour-coordinator">{children}</div>,
}));
vi.mock("@/lib/i18n/extend-locale-scope", () => ({ ExtendLocaleScope: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/notifications/NotificationsHost", () => ({
  NotificationsHost: () => <div data-testid="notifications-host" />,
}));

import CampaignLayout from "@/app/campaigns/[id]/layout";

afterEach(() => { mocks.kind = "demo"; });

describe("CampaignLayout", () => {
  async function html() {
    return renderToStaticMarkup(await CampaignLayout({ children: <main>campaign</main>, params: Promise.resolve({ id: "c1" }) }));
  }

  it("mounts tours but skips the member-only notifications host for demos", async () => {
    const markup = await html();

    expect(markup).toContain("tour-coordinator");
    expect(markup).not.toContain("notifications-host");
  });

  it("keeps the notifications host on regular campaigns and does not mount tours", async () => {
    mocks.kind = "campaign";

    const markup = await html();

    expect(markup).not.toContain("tour-coordinator");
    expect(markup).toContain("notifications-host");
  });
});
