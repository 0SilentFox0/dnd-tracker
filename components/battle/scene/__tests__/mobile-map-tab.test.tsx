// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("@/lib/hooks/common/useMediaQuery", () => ({ useMediaQuery: () => false }));

const aura = vi.hoisted(() => ({ step: null as unknown }));

vi.mock("@/lib/hooks/battle", async (importOriginal) => ({ ...(await importOriginal<object>()), useAuraZones: () => aura.step }));

import { MapStripSlotContext } from "@/components/battle/scene/MapStrip";
import { MobileBattleLayout } from "@/components/battle/scene/MobileBattleLayout";
import { SpellAimPanel } from "@/components/battle/wizards/spellbook/SpellAimPanel";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  disconnect() {}
  unobserve() {}
});

const MAP = { cols: 8, rows: 4, background: null, opacity: 0.3 };

const tab = (name: RegExp) => screen.getByRole("tab", { name });

const topBar = () => screen.queryByRole("button", { name: /Анімації дій/ });

afterEach(() => {
  cleanup();
  aura.step = null;
});

describe("MobileBattleLayout — вкладка «Карта» на весь екран", () => {
  it("на карті немає шапки, ініціативи й банера; на списках усе як було", () => {
    const { wrapper } = fakeScene({ isMyTurn: true, map: MAP });

    const { container } = render(<MobileBattleLayout />, { wrapper });

    expect(tab(/Карта/).getAttribute("aria-selected")).toBe("true");
    expect(topBar()).toBeNull();
    expect(container.querySelector('[data-flip="round"]')).toBeNull();
    expect(screen.queryByText("Твій хід")).toBeNull();
    expect(screen.queryByRole("button", { name: /Атака/ })).toBeNull();

    fireEvent.click(tab(/Союзники/));

    expect(topBar()).not.toBeNull();
    expect(container.querySelector('[data-flip="round"]')).not.toBeNull();
    expect(screen.getAllByText("Твій хід").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Атака/ })).toBeTruthy();
  });

  it("мій хід: рядок «Твій хід · Дії» веде на останню вкладку зі списком", () => {
    const { wrapper } = fakeScene({ isMyTurn: true, map: MAP });

    render(<MobileBattleLayout />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: /Твій хід · Дії/ }));
    expect(tab(/Вороги/).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: /Атака/ })).toBeTruthy();

    fireEvent.click(tab(/Союзники/));
    fireEvent.click(tab(/Карта/));
    fireEvent.click(screen.getByRole("button", { name: /Твій хід · Дії/ }));
    expect(tab(/Союзники/).getAttribute("aria-selected")).toBe("true");
  });

  it("мораль: рядок «Перевірка моралі» замість кубиків", () => {
    const { wrapper } = fakeScene({ isMyTurn: true, map: MAP, morale: 2 });

    render(<MobileBattleLayout />, { wrapper });

    expect(screen.queryByText(/Перевірка моралі · d10/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Перевірка моралі/ }));
    expect(screen.getByText(/Перевірка моралі · d10/)).toBeTruthy();
  });

  it("чекає вибору зони аури — рядок про аури замість «Дії»", () => {
    aura.step = { aura: { id: "a", name: "Аура" }, candidates: [], selected: [], toggle: vi.fn(), confirm: vi.fn(), pending: false };

    const { wrapper } = fakeScene({ isMyTurn: true, map: MAP });

    render(<MobileBattleLayout />, { wrapper });

    expect(screen.getByRole("button", { name: /Оберіть зону аури/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Твій хід · Дії/ })).toBeNull();
  });

  it("фаза дії повідомляє сцені, що клік по ворогу — атака; мораль — ні", () => {
    const acting = fakeScene({ isMyTurn: true, map: MAP });

    render(<MobileBattleLayout />, { wrapper: acting.wrapper });
    expect(acting.value.intents.setAttackReady).toHaveBeenLastCalledWith("me");
    cleanup();

    const morale = fakeScene({ isMyTurn: true, map: MAP, morale: 2 });

    render(<MobileBattleLayout />, { wrapper: morale.wrapper });
    expect(morale.value.intents.setAttackReady).toHaveBeenLastCalledWith(null);
    expect(morale.value.intents.setAttackReady).not.toHaveBeenCalledWith("me");
  });

  it("не мій хід: рядок «ходить …» і карта", () => {
    const { wrapper } = fakeScene({ isMyTurn: false, map: MAP });

    const { container } = render(<MobileBattleLayout />, { wrapper });

    expect(screen.getByRole("button", { name: /ходить Гоблін/ })).toBeTruthy();
    expect(container.querySelector("[data-fx-clip]")).not.toBeNull();
  });

  it("наведення шаблону: рядок ховається, лишається слот під панель", () => {
    const mapAim = { template: { shape: "circle" as const, size: 10 }, casterId: "me", onAim: vi.fn() };

    const { wrapper } = fakeScene({ isMyTurn: false, map: MAP, mapAim });

    const { container } = render(<MobileBattleLayout />, { wrapper });

    expect(screen.queryByText(/ходить/)).toBeNull();
    expect(container.querySelector("[data-map-strip-slot]")).not.toBeNull();
  });

  it("бій без карти: шапка, банер і панель героя як раніше", () => {
    const { wrapper } = fakeScene({ isMyTurn: true });

    const { container } = render(<MobileBattleLayout />, { wrapper });

    expect(screen.queryByRole("tab", { name: /Карта/ })).toBeNull();
    expect(topBar()).not.toBeNull();
    expect(screen.getAllByText("Твій хід").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Атака/ })).toBeTruthy();
    expect(container.querySelector("[data-map-strip-slot]")).toBeNull();
  });
});

describe("SpellAimPanel", () => {
  const book = {
    state: { aim: null },
    view: { aimTargets: [] },
    actions: { back: vi.fn(), close: vi.fn(), confirmTargets: vi.fn() },
  } as unknown as Parameters<typeof SpellAimPanel>[0]["book"];

  it("зі слотом стоїть у смузі під картою, без fixed", () => {
    const slot = document.createElement("div");

    document.body.append(slot);
    render(
      <MapStripSlotContext value={slot}>
        <SpellAimPanel book={book} spellName="Вогняна куля" />
      </MapStripSlotContext>,
    );

    const panel = screen.getByRole("region", { name: "Наведення заклинання" });

    expect(slot.contains(panel)).toBe(true);
    expect(panel.className).not.toContain("fixed");
    slot.remove();
  });

  it("без слота (десктоп) — панель fixed, як раніше", () => {
    render(<SpellAimPanel book={book} spellName="Вогняна куля" />);

    expect(screen.getByRole("region", { name: "Наведення заклинання" }).className).toContain("fixed");
  });
});
