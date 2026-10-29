// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("@/lib/hooks/acquaintances", () => ({
  useAcquaintances: () => ({ data: state.data, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useAcquaintanceNote: () => ({ save: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/notifications", () => ({ useSeenOnOpen: vi.fn(() => new Set<string>()) }));

import { AcquaintancesPageClient } from "../page-client";

import { useSeenOnOpen } from "@/lib/hooks/notifications";
import type { AcquaintanceView } from "@/types/acquaintances";

Object.assign(Element.prototype, { scrollIntoView: vi.fn() });

const view = (id: string, name: string): AcquaintanceView => ({ id, kind: "micro", characterId: null, name, avatarUrl: null, description: "", sourcePageId: "p1", sourceSectionId: "s1", hidden: false, entries: [], notes: [] });

beforeEach(() => {
  state.data = { isDM: false, enabled: true, items: [view("a1", "Ярема"), view("a2", "Борис")] };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const type = (value: string) => act(() => void fireEvent.change(screen.getByLabelText("Пошук знайомства"), { target: { value } }));

describe("AcquaintancesPageClient", () => {
  it("filters cards by name", async () => {
    render(<AcquaintancesPageClient campaignId="c1" isDM={false} focusId={undefined} />);

    type("Бор");

    expect(await screen.findByText("Борис")).toBeTruthy();
    expect(screen.queryByText("Ярема")).toBeNull();
  });

  it("shows the search empty state when nothing matches", async () => {
    render(<AcquaintancesPageClient campaignId="c1" isDM={false} focusId={undefined} />);

    type("zzz");

    expect(await screen.findByText(/common.search.noResults/)).toBeTruthy();
  });

  it("subscribes to seen-on-open only for players", () => {
    render(<AcquaintancesPageClient campaignId="c1" isDM focusId={undefined} />);

    expect(useSeenOnOpen).toHaveBeenCalledWith("c1", { types: ["acquaintance"], enabled: false });

    cleanup();
    render(<AcquaintancesPageClient campaignId="c1" isDM={false} focusId={undefined} />);

    expect(useSeenOnOpen).toHaveBeenLastCalledWith("c1", { types: ["acquaintance"], enabled: true });
  });

  it("tells the DM that players do not see the section while the toggle is off", () => {
    state.data = { isDM: true, enabled: false, items: [view("a1", "Ярема")] };

    render(<AcquaintancesPageClient campaignId="c1" isDM focusId={undefined} />);

    expect(screen.getByText(/Гравці ще не бачать цей розділ/)).toBeTruthy();
  });

  it("scrolls the focused card into view", () => {
    render(<AcquaintancesPageClient campaignId="c1" isDM={false} focusId="a2" />);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
