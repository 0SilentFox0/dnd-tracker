// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShowBattleCall } from "@/components/show/stage/ShowBattleCall";
import { resetPlayerViews } from "@/lib/hooks/common";
import type { ShowBattle } from "@/types/show";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/link", () => ({ default: ({ children, ...p }: Record<string, unknown>) => <a {...p}>{children as never}</a> }));

const battle = { id: "b1", name: "Fight" } as ShowBattle;

afterEach(() => {
  cleanup();
  resetPlayerViews();
});

describe("ShowBattleCall", () => {
  it("sets the battle player-view flag on click when the show is in player view", () => {
    render(<ShowBattleCall campaignId="c1" battle={battle} playerView />);
    fireEvent.click(screen.getByRole("link"));

    expect(window.sessionStorage.getItem("player-view:b1")).toBe("on");
  });

  it("leaves the flag alone otherwise", () => {
    render(<ShowBattleCall campaignId="c1" battle={battle} />);
    fireEvent.click(screen.getByRole("link"));

    expect(window.sessionStorage.getItem("player-view:b1")).toBeNull();
  });
});
