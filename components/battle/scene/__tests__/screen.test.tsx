// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const media = vi.hoisted(() => ({ wide: false }));

vi.mock("@/lib/hooks/common/useMediaQuery", () => ({ useMediaQuery: () => media.wide }));

import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

describe("BattleScreen", () => {
  afterEach(cleanup);

  it("телефон, не мій хід: вкладки, «ходить», мій герой, без кнопок дій", () => {
    media.wide = false;

    const { wrapper } = fakeScene({ isMyTurn: false });

    render(<BattleScreen />, { wrapper });

    expect(screen.getByRole("tab", { name: /Вороги/ })).toBeTruthy();
    expect(screen.getByText(/ходить/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Атака/ })).toBeNull();
  });

  it("телефон, мій хід: банер і дії", () => {
    media.wide = false;

    const { wrapper } = fakeScene({ isMyTurn: true });

    render(<BattleScreen />, { wrapper });

    expect(screen.getAllByText("Твій хід").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Атака/ })).toBeTruthy();
  });

  it("десктоп: союзники і вороги поруч, журнал праворуч", () => {
    media.wide = true;

    const { wrapper } = fakeScene({ isMyTurn: false });

    render(<BattleScreen />, { wrapper });

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText(/Союзники ·/)).toBeTruthy();
    expect(screen.getByText(/Вороги ·/)).toBeTruthy();
    expect(screen.getByText("Журнал")).toBeTruthy();
  });

  it("завершений бій: банер «Бій завершено» замість «ходить», без дій — на телефоні й десктопі", () => {
    for (const wide of [false, true]) {
      media.wide = wide;

      const { wrapper } = fakeScene({ isMyTurn: false, status: "completed" });

      render(<BattleScreen />, { wrapper });

      expect(screen.getAllByText("Бій завершено").length).toBeGreaterThan(0);
      expect(screen.queryByText(/ходить/)).toBeNull();
      expect(screen.queryByRole("button", { name: /Атака/ })).toBeNull();
      expect(screen.queryByText(/хід через|Дії стануть доступні/)).toBeNull();

      cleanup();
    }
  });

  it("DM може скинути завершений бій, але не передати хід", () => {
    media.wide = true;

    const { wrapper } = fakeScene({ isDM: true, isMyTurn: false, status: "completed" });

    render(<BattleScreen />, { wrapper });

    expect(screen.getByRole("button", { name: "Скинути" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Наступний хід" })).toBeNull();
  });
});
