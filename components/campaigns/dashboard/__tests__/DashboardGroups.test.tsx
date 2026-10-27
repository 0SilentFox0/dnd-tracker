// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardGroups } from "@/components/campaigns/dashboard/DashboardGroups";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockClear());

afterEach(cleanup);

const type = (value: string) => {
  act(() => {
    fireEvent.change(screen.getByLabelText("Пошук розділу"), { target: { value } });
  });
};

const tileLinks = () => screen.getAllByRole("link");

describe("DashboardGroups", () => {
  it("DM without query shows group headings and 12 links", () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    for (const t of ["Гра", "Герої", "Бібліотеки"]) expect(screen.getByRole("heading", { name: t })).toBeTruthy();

    expect(tileLinks()).toHaveLength(12);
  });

  it("shows pending drafts in the characters subtitle", () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={2} />);

    expect(screen.getByText(/2 на схваленні/)).toBeTruthy();
  });

  it("player sees own sections without group headings", () => {
    render(<DashboardGroups campaignId="c1" isDM={false} pendingDrafts={0} />);

    for (const t of ["Мій персонаж", "Показ", "Довідник"]) expect(screen.getByText(t)).toBeTruthy();

    expect(screen.queryByText("Юніти")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
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

    expect(await screen.findByText(/Нічого не знайдено/)).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Очистити пошук" }).at(-1)!);

    expect(await screen.findAllByRole("link")).toHaveLength(12);
  });

  it("Enter navigates to the first match, and does nothing without one", async () => {
    render(<DashboardGroups campaignId="c1" isDM pendingDrafts={0} />);

    type("закл");

    await screen.findByText("Заклинання");

    fireEvent.submit(screen.getByLabelText("Пошук розділу").closest("form")!);

    expect(push).toHaveBeenCalledWith("/campaigns/c1/dm/spells");

    push.mockClear();
    type("zzz");

    await screen.findByText(/Нічого не знайдено/);

    fireEvent.submit(screen.getByLabelText("Пошук розділу").closest("form")!);

    expect(push).not.toHaveBeenCalled();
  });
});
