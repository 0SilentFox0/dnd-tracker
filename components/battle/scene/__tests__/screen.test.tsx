// @vitest-environment happy-dom
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const media = vi.hoisted(() => ({ wide: false }));

vi.mock("@/lib/hooks/common/useMediaQuery", () => ({ useMediaQuery: () => media.wide }));

import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  disconnect() {}
  unobserve() {}
});

const MAP = { cols: 4, rows: 3, background: null, opacity: 0.3 };

describe("BattleScreen", () => {
  afterEach(cleanup);

  it("десктоп з картою: карта замість списків, журнал праворуч", async () => {
    media.wide = true;

    const { wrapper } = fakeScene({ isMyTurn: false, map: MAP });

    const { container } = render(<BattleScreen />, { wrapper });

    expect(await screen.findByText("Журнал")).toBeTruthy();
    expect(container.querySelector("[data-fx-clip]")).not.toBeNull();
    expect(screen.queryByText(/Союзники ·/)).toBeNull();
    expect(screen.queryByText(/Вороги ·/)).toBeNull();
  });

  it("десктоп з картою: перемикач «Колонки» показує списки без карти", async () => {
    media.wide = true;
    window.localStorage.clear();

    const { wrapper } = fakeScene({ isMyTurn: false, map: MAP });

    const { container } = render(<BattleScreen />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Колонки" }));
    expect(screen.getByText(/Союзники ·/)).toBeTruthy();
    expect(screen.getByText(/Вороги ·/)).toBeTruthy();
    expect(container.querySelector("[data-fx-clip]")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Карта" }));
    expect(container.querySelector("[data-fx-clip]")).not.toBeNull();
  });

  it("десктоп без карти: перемикача немає", async () => {
    media.wide = true;

    const { wrapper } = fakeScene({ isMyTurn: false });

    render(<BattleScreen />, { wrapper });

    expect(await screen.findByText(/Союзники ·/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Колонки" })).toBeNull();
  });

  it("телефон з картою: вкладка «Карта» за замовчуванням, є «Союзники» і «Вороги»", () => {
    media.wide = false;

    const { wrapper } = fakeScene({ isMyTurn: false, map: MAP });

    const { container } = render(<BattleScreen />, { wrapper });

    expect(screen.getByRole("tab", { name: /Карта/ }).getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector("[data-fx-clip]")).not.toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Вороги/ }));

    expect(container.querySelector("[data-fx-clip]")).toBeNull();
    expect(screen.getByRole("tab", { name: /Вороги/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("телефон без карти: вкладки Карта немає", () => {
    media.wide = false;

    const { wrapper } = fakeScene({ isMyTurn: false });

    const { container } = render(<BattleScreen />, { wrapper });

    expect(screen.queryByRole("tab", { name: /Карта/ })).toBeNull();
    expect(container.querySelector("[data-fx-clip]")).toBeNull();
  });

  it("серверний HTML не містить обчисленої висоти шапки", () => {
    media.wide = false;

    const { wrapper: Wrapper } = fakeScene({ isMyTurn: false });

    const html = renderToString(<Wrapper><BattleScreen /></Wrapper>);

    expect(html).not.toContain("- 0px)");
    expect(html).toContain("below-header");
  });

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

  it("десктоп: союзники і вороги поруч, журнал праворуч", async () => {
    media.wide = true;

    const { wrapper } = fakeScene({ isMyTurn: false });

    render(<BattleScreen />, { wrapper });

    expect(await screen.findByText(/Союзники ·/)).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText(/Вороги ·/)).toBeTruthy();
    expect(screen.getByText("Журнал")).toBeTruthy();
  });

  it("завершений бій: банер «Бій завершено» замість «ходить», без дій — на телефоні й десктопі", async () => {
    for (const wide of [false, true]) {
      media.wide = wide;

      const { wrapper } = fakeScene({ isMyTurn: false, status: "completed" });

      render(<BattleScreen />, { wrapper });

      expect((await screen.findAllByText("Бій завершено")).length).toBeGreaterThan(0);
      expect(screen.queryByText(/ходить/)).toBeNull();
      expect(screen.queryByRole("button", { name: /Атака/ })).toBeNull();
      expect(screen.queryByText(/хід через|Дії стануть доступні/)).toBeNull();

      cleanup();
    }
  });

  it("DM може скинути завершений бій, але не передати хід", async () => {
    media.wide = true;

    const { wrapper } = fakeScene({ isDM: true, isMyTurn: false, status: "completed" });

    render(<BattleScreen />, { wrapper });

    expect(await screen.findByRole("button", { name: "Скинути" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Наступний хід" })).toBeNull();
  });

  it("телефон: журнал відкривається станом сцени (openLog)", () => {
    media.wide = false;

    const s = fakeScene({ isMyTurn: false });

    s.value.log = { open: true, focus: null };

    render(<BattleScreen />, { wrapper: s.wrapper });

    expect(screen.getByRole("dialog")).toHaveTextContent("Журнал");
  });
});
