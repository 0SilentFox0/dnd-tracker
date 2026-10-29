// @vitest-environment happy-dom
import { renderToString } from "react-dom/server";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const media = vi.hoisted(() => ({ wide: false }));

vi.mock("@/lib/hooks/common/useMediaQuery", () => ({ useMediaQuery: () => media.wide }));

const fx = vi.hoisted(() => ({ on: true, preloadFx: vi.fn(() => Promise.resolve()) }));

vi.mock("@/lib/hooks/battle/useFxEnabled", () => ({ useFxEnabled: () => ({ enabled: fx.on, userEnabled: fx.on, motionAllowed: true, setEnabled: vi.fn() }) }));
vi.mock("@/components/battle/fx/preload", () => ({ preloadFx: fx.preloadFx }));

import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { ParticipantSide } from "@/lib/constants/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { render } from "@/lib/i18n/test/render-uk";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

vi.unmock("next-intl");

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  disconnect() {}
  unobserve() {}
});

const MAP = { cols: 4, rows: 3, background: null, opacity: 0.3 };

const base = createMockParticipant();

const IMP = { ...base, basicInfo: { ...base.basicInfo, id: "imp", name: "Біс", side: ParticipantSide.ENEMY }, battleData: { ...base.battleData, reserved: true } };

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

  it("десктоп, вигляд «Карта»: резерв окремою групою з кнопкою введення; у «Колонках» — лише в списку", async () => {
    media.wide = true;
    window.localStorage.clear();

    const { wrapper, value } = fakeScene({ isMyTurn: false, map: MAP, isDM: true, reserve: [IMP] });

    render(<BattleScreen />, { wrapper });

    const group = await screen.findByRole("region", { name: "Резерв" });

    expect(group.textContent).toContain("Резерв (1)");
    fireEvent.click(screen.getByRole("button", { name: "Ввести в бій: Біс" }));
    expect(value.actions.reveal.mutate).toHaveBeenCalledWith({ participantIds: ["imp"] });

    fireEvent.click(screen.getByRole("button", { name: "Колонки" }));
    expect(screen.queryByRole("region", { name: "Резерв" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Ввести в бій: Біс" })).toHaveLength(1);
  });

  it("телефон, вкладка «Карта»: кнопка «Резерв (N)» відкриває список; без резерву кнопки немає", async () => {
    media.wide = false;

    const { wrapper, value } = fakeScene({ isMyTurn: false, map: MAP, isDM: true, reserve: [IMP] });

    render(<BattleScreen />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "Резерв (1)" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ввести в бій: Біс" }));
    expect(value.actions.reveal.mutate).toHaveBeenCalledWith({ participantIds: ["imp"] });

    cleanup();
    render(<BattleScreen />, { wrapper: fakeScene({ isMyTurn: false, map: MAP }).wrapper });
    expect(screen.queryByRole("button", { name: /Резерв/ })).toBeNull();
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

  it("наведення шаблону показує карту: десктоп у «Колонках» і телефон на вкладці «Вороги»", () => {
    const mapAim = { template: { shape: "circle" as const, size: 10 }, casterId: "me", onAim: vi.fn() };

    media.wide = true;
    window.localStorage.setItem("battle-view-mode:b1", "columns");

    const desk = render(<BattleScreen />, { wrapper: fakeScene({ isMyTurn: false, map: MAP, mapAim }).wrapper });

    expect(desk.container.querySelector("[data-fx-clip]")).not.toBeNull();
    expect(window.localStorage.getItem("battle-view-mode:b1")).toBe("columns");
    desk.unmount();
    window.localStorage.clear();

    media.wide = false;

    render(<BattleScreen />, { wrapper: fakeScene({ isMyTurn: false, map: MAP, mapAim }).wrapper });

    fireEvent.click(screen.getByRole("tab", { name: /Вороги/ }));
    expect(screen.getByRole("tab", { name: /Карта/ }).getAttribute("aria-selected")).toBe("true");
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

  it("FX chunks are preloaded only while the player keeps FX on", async () => {
    media.wide = false;

    const { wrapper } = fakeScene({ isMyTurn: false });

    fx.on = false;
    fx.preloadFx.mockClear();
    render(<BattleScreen />, { wrapper });
    await new Promise((r) => setTimeout(r, 0));
    expect(fx.preloadFx).not.toHaveBeenCalled();
    cleanup();

    fx.on = true;
    render(<BattleScreen />, { wrapper });
    await vi.waitFor(() => expect(fx.preloadFx).toHaveBeenCalled());
  });

  it("телефон: журнал відкривається станом сцени (log.show)", () => {
    media.wide = false;

    const s = fakeScene({ isMyTurn: false });

    s.value.log = { ...s.value.log, open: true };

    render(<BattleScreen />, { wrapper: s.wrapper });

    expect(screen.getByRole("dialog")).toHaveTextContent("Журнал");
  });
});
