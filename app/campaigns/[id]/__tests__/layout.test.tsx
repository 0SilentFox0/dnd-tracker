import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ userId: "u1", kind: "demo", wfrp: false }));

vi.mock("@/lib/auth", () => ({ getSessionUserId: () => Promise.resolve(mocks.userId) }));
vi.mock("@/lib/server/campaigns/access", () => ({ getCampaignForLayout: () => Promise.resolve({ kind: mocks.kind }) }));
vi.mock("@/components/onboarding/DemoTourCoordinator", () => ({
  DemoTourCoordinator: ({ children }: { children: React.ReactNode }) => <div data-testid="tour-coordinator">{children}</div>,
}));
vi.mock("@/lib/server/campaigns/system-key", () => ({ isWfrpCampaign: () => Promise.resolve(mocks.wfrp) }));
vi.mock("@/lib/i18n/extend-locale-scope", () => ({
  ExtendLocaleScope: ({ children, namespaces }: { children: React.ReactNode; namespaces: string[] }) => <div data-scope={namespaces.join(",")}>{children}</div>,
}));
vi.mock("@/components/notifications/NotificationsHost", () => ({
  NotificationsHost: () => <div data-testid="notifications-host" />,
}));

import CampaignLayout from "@/app/campaigns/[id]/layout";

afterEach(() => {
  mocks.kind = "demo";
  mocks.wfrp = false;
});

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

  it("adds the wfrpMagic scope only for wfrp campaigns", async () => {
    mocks.kind = "campaign";

    expect(await html()).not.toContain("wfrpMagic");

    mocks.wfrp = true;

    expect(await html()).toContain('data-scope="wfrpMagic,wfrpAdvancement"');
  });
});
