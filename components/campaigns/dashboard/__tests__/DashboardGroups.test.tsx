// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardGroups } from "@/components/campaigns/dashboard/DashboardGroups";
import { useNotifications } from "@/lib/hooks/notifications";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/hooks/notifications", () => ({ useNotifications: vi.fn(() => ({ data: undefined })) }));

beforeEach(() => {
  push.mockClear();
  vi.mocked(useNotifications).mockReturnValue({ data: undefined } as never);
});

afterEach(cleanup);

const type = (value: string) => {
  act(() => {
    fireEvent.change(screen.getByLabelText("Пошук розділу"), { target: { value } });
  });
};

const tileLinks = () => screen.getAllByRole("link");

describe("DashboardGroups", () => {
  it("DM without query shows group headings and 13 links", () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    for (const t of ["Гра", "Герої", "Бібліотеки"]) expect(screen.getByRole("heading", { name: t })).toBeTruthy();

    expect(tileLinks()).toHaveLength(13);
  });

  it("shows pending drafts in the characters subtitle", () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={2} />);

    expect(screen.getByText(/2 на схваленні/)).toBeTruthy();
  });

  it("player sees own sections without group headings", () => {
    render(<DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />);

    for (const t of ["Мій персонаж", "Показ", "Карта", "Довідник"]) expect(screen.getByText(t)).toBeTruthy();

    expect(screen.queryByText("Юніти")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("hides the world tile for the keys the page hides", () => {
    render(<DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} hiddenKeys={["player-world"]} />);

    expect(screen.queryByText("Карта")).toBeNull();
    expect(screen.getByText("Показ")).toBeTruthy();
    expect(tileLinks()).toHaveLength(4);
  });

  it("the world tile links to the player map and is found by search", async () => {
    render(<DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />);

    type("світ");

    expect((await screen.findByText("Карта")).closest("a")?.getAttribute("href")).toBe("/campaigns/c1/world");
  });

  it("query filters to a flat grid without headings", async () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    type("моби");

    expect(await screen.findByText("Юніти")).toBeTruthy();
    expect(tileLinks()).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Гра" })).toBeNull();
  });

  it("empty result can be cleared", async () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    type("zzz");

    expect(await screen.findByText(/common.search.noResults/)).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "common.search.clear" }).at(-1)!);

    expect(await screen.findAllByRole("link")).toHaveLength(13);
  });

  it("Enter with a padded uppercase query navigates to the match", async () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    type("  ЗАКЛ ");

    await screen.findByText("Заклинання");

    fireEvent.submit(screen.getByLabelText("Пошук розділу").closest("form")!);

    expect(push).toHaveBeenCalledWith("/campaigns/c1/dm/spells");
  });

  it("Enter navigates to the first match, and does nothing without one", async () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    type("закл");

    await screen.findByText("Заклинання");

    fireEvent.submit(screen.getByLabelText("Пошук розділу").closest("form")!);

    expect(push).toHaveBeenCalledWith("/campaigns/c1/dm/spells");

    push.mockClear();
    type("zzz");

    await screen.findByText(/common.search.noResults/);

    fireEvent.submit(screen.getByLabelText("Пошук розділу").closest("form")!);

    expect(push).not.toHaveBeenCalled();
  });

  it("player with unread item sees a pill on the character tile", () => {
    vi.mocked(useNotifications).mockReturnValue({ data: [{ id: "n1", type: "item", refId: "a1", href: "/h", createdAt: "x" }] } as never);

    render(<DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />);

    expect(screen.getAllByText("common.notifications.new")).toHaveLength(1);
    expect(useNotifications).toHaveBeenCalledWith("c1", { enabled: true });
  });

  it("DM in a campaign sees the acquaintances tile in the game group, a template does not", () => {
    const { unmount } = render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    expect(screen.getByText("Знайомства").closest("a")?.getAttribute("href")).toBe("/campaigns/c1/acquaintances");

    unmount();
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} context={{ isTemplate: true, classesEnabled: false }} />);

    expect(screen.queryByText("Знайомства")).toBeNull();
  });

  it("player does not see the acquaintances tile when the page hides it", () => {
    render(<DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} hiddenKeys={["acquaintances"]} />);

    expect(screen.queryByText("Знайомства")).toBeNull();
  });

  it("player with an unread acquaintance sees a pill on its tile", () => {
    vi.mocked(useNotifications).mockReturnValue({ data: [{ id: "n1", type: "acquaintance", refId: "a1", href: "/h", createdAt: "x" }] } as never);

    render(<DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />);

    expect(screen.getAllByText("common.notifications.new")).toHaveLength(1);
  });

  it("DM gets no pill and the query is disabled", () => {
    vi.mocked(useNotifications).mockReturnValue({ data: [{ id: "n1", type: "item", refId: "a1", href: "/h", createdAt: "x" }] } as never);

    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    expect(screen.queryByText("common.notifications.new")).toBeNull();
    expect(useNotifications).toHaveBeenCalledWith("c1", { enabled: false });
  });
});
