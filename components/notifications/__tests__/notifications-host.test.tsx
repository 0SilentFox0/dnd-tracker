// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationsHost } from "@/components/notifications/NotificationsHost";
import { useNotifications, useNotificationsSync } from "@/lib/hooks/notifications";
import type { PlayerNotification } from "@/types/notifications";

const pathname = vi.hoisted(() => ({ value: "/campaigns/c1" }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("@/lib/hooks/notifications", () => ({ useNotifications: vi.fn(), useNotificationsSync: vi.fn(), useMarkRead: vi.fn() }));

const item: PlayerNotification = { id: "n1", type: "item", refId: "a1", href: "/campaigns/c1/character?tab=items", createdAt: "2026-10-28T00:00:00.000Z" };

const given = (data: PlayerNotification[]) => vi.mocked(useNotifications).mockReturnValue({ data } as never);

beforeEach(() => {
  vi.clearAllMocks();
  pathname.value = "/campaigns/c1";
  sessionStorage.clear();
  given([item]);
});

afterEach(cleanup);

describe("NotificationsHost", () => {
  it("shows a toast with the type text and link", () => {
    render(<NotificationsHost campaignId="c1" userId="u1" />);

    expect(screen.getByText("common.notifications.item")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe(item.href);
    expect(useNotificationsSync).toHaveBeenCalledWith("c1", "u1");
  });

  it("does not repeat a toast already shown in this session", () => {
    sessionStorage.setItem("notifications-toasted", JSON.stringify(["n1"]));

    render(<NotificationsHost campaignId="c1" userId="u1" />);

    expect(screen.queryByText("common.notifications.item")).toBeNull();
  });

  it("remembers shown toasts in sessionStorage", () => {
    render(<NotificationsHost campaignId="c1" userId="u1" />);

    expect(JSON.parse(sessionStorage.getItem("notifications-toasted") ?? "[]")).toContain("n1");
  });

  it("shows no toasts on battle pages", () => {
    pathname.value = "/campaigns/c1/battles/b1";

    render(<NotificationsHost campaignId="c1" userId="u1" />);

    expect(screen.queryByText("common.notifications.item")).toBeNull();
  });

  it("still shows the toast when sessionStorage throws", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(<NotificationsHost campaignId="c1" userId="u1" />);

    expect(screen.getByText("common.notifications.item")).toBeTruthy();

    get.mockRestore();
    set.mockRestore();
  });

  it("is disabled without a user", () => {
    render(<NotificationsHost campaignId="c1" userId={null} />);

    expect(vi.mocked(useNotifications)).toHaveBeenCalledWith("c1", { enabled: false });
  });
});
