// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MazeToolbar } from "../MazeToolbar";
import { mazeMap, RO } from "./maze-fixtures";

import { BattleMapPanel } from "@/components/battle/map/BattleMapPanel";
import { MazeViewProvider } from "@/components/battle/scene/MazeViewProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type MazeTools, useMazeView } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { MazeConfig } from "@/types/battle";

afterEach(cleanup);

vi.stubGlobal("ResizeObserver", RO);

function panel({ isDM = true, phone = false, maze = {} as Partial<MazeConfig> } = {}) {
  const scene = fakeScene({ isDM, map: mazeMap(maze) });

  const mutate = vi.fn();

  Object.assign(scene.value.actions, { maze: { mutate, mutateAsync: vi.fn(), isPending: false } });

  const Wrapper = scene.wrapper;

  const view = render(
    <Wrapper>
      <TooltipProvider>
        <BattleMapPanel phone={phone} />
      </TooltipProvider>
    </Wrapper>,
  );

  return { ...view, mutate };
}

describe("MazeToolbar", () => {
  it("гравець не бачить інструментів лабіринту", () => {
    const { queryByRole } = panel({ isDM: false });

    expect(queryByRole("button", { name: "Згенерувати" })).toBeNull();
    expect(queryByRole("button", { name: "Правити" })).toBeNull();
  });

  it("на телефоні інструментів лабіринту немає", () => {
    const { queryByRole } = panel({ phone: true });

    expect(queryByRole("button", { name: "Згенерувати" })).toBeNull();
    expect(queryByRole("button", { name: "Розставити" })).not.toBeNull();
  });

  it("ДМ до першого кроку: «Згенерувати» і «Розкидати старти», без «Місцевість»", () => {
    const { getByRole, queryByRole } = panel();

    expect(getByRole("button", { name: "Згенерувати" })).toBeTruthy();
    expect(getByRole("button", { name: "Розкидати старти" })).toBeTruthy();
    expect(queryByRole("button", { name: "Перетасувати" })).toBeNull();
    expect(queryByRole("button", { name: "Місцевість" })).toBeNull();
  });

  it("після першого кроку — «Перетасувати», без «Розкидати старти»", () => {
    const { getByRole, queryByRole } = panel({ maze: { moved: true } });

    expect(getByRole("button", { name: "Перетасувати" })).toBeTruthy();
    expect(queryByRole("button", { name: "Згенерувати" })).toBeNull();
    expect(queryByRole("button", { name: "Розкидати старти" })).toBeNull();
  });

  it("«Згенерувати» відкриває діалог і надсилає генерацію з випадковим виходом", () => {
    const { getByRole, mutate } = panel({ maze: { difficulty: "hard" } });

    fireEvent.click(getByRole("button", { name: "Згенерувати" }));

    const dialog = getByRole("dialog");

    fireEvent.click([...dialog.ownerDocument.querySelectorAll("button")].find((b) => b.textContent === "Згенерувати" && b.getAttribute("form"))!);

    expect(mutate).toHaveBeenCalledWith({ op: "generate", difficulty: "hard", teleportPairs: 1, fogPatches: 2, exit: null }, undefined);
  });

  it("«Темрява» перемикає світло", () => {
    const { getByRole, mutate } = panel({ maze: { dark: true } });

    const dark = getByRole("button", { name: "Темрява" });

    expect(dark.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(dark);

    expect(mutate).toHaveBeenCalledWith({ op: "dark", on: false }, undefined);
  });

  it("«Правити» вимикає «Розставити», Esc виходить", () => {
    const { getByRole } = panel();

    fireEvent.click(getByRole("button", { name: "Розставити" }));
    fireEvent.click(getByRole("button", { name: "Правити" }));

    expect(getByRole("button", { name: "Правити" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByRole("button", { name: "Розставити" }).getAttribute("aria-pressed")).toBe("false");
    expect(getByRole("button", { name: "Стіни" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(getByRole("button", { name: "Правити" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("у режимі «Правити» ребра клікабельні, клік ставить стіну", () => {
    const { getByRole, container, mutate } = panel({ maze: { walls: ["2:2:s"] } });

    expect(container.querySelector("[data-maze-edge]")).toBeNull();

    fireEvent.click(getByRole("button", { name: "Правити" }));

    expect(container.querySelectorAll("[data-maze-edge]")).toHaveLength(7 * 6 + 8 * 5);

    fireEvent.pointerDown(container.querySelector('[data-maze-edge="1:1:e"]')!, { button: 0 });
    fireEvent.pointerUp(window);

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ op: "walls", add: ["1:1:e"], remove: [] });
  });

  it("підрежим «Туман»: клік по клітинці вмикає туман", () => {
    const { getByRole, container, mutate } = panel();

    fireEvent.click(getByRole("button", { name: "Правити" }));
    fireEvent.click(getByRole("button", { name: "Туман" }));

    expect(container.querySelector("[data-maze-edge]")).toBeNull();

    fireEvent.click(container.querySelector('[data-fx-cell="3:3"]')!);

    expect(mutate).toHaveBeenCalledWith({ op: "fog", cells: ["3:3"], on: true }, undefined);
  });
});

function ToolbarWithAsHero() {
  const { asHero } = useMazeView();

  const tools: MazeTools = {
    state: { canGenerate: false, tool: "none", dark: false, awaitingExit: false, heroes: [{ id: "me", name: "Фрейда" }] },
    actions: { setTool: vi.fn(), clickCell: vi.fn(), toggleDark: vi.fn(), scatterStarts: vi.fn(), generate: vi.fn(), reshuffle: vi.fn() },
    editing: null,
    asHero,
  };

  return (
    <>
      <span data-testid="as-hero">{asHero.id ?? "off"}</span>
      <MazeToolbar tools={tools} tall={false} />
      <button type="button" onClick={() => asHero.set("me")}>pick</button>
    </>
  );
}

describe("«Очима гравця» завжди можна вимкнути", () => {
  it("після вибору героя є кнопка «Вимкнути», що повертає погляд ДМ", () => {
    const s = fakeScene({ isDM: true, map: mazeMap({ exit: { x: 7, y: 0 } }) });

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <s.wrapper>
        <MazeViewProvider>{children}</MazeViewProvider>
      </s.wrapper>
    );

    render(<ToolbarWithAsHero />, { wrapper: Wrapper });

    expect(screen.queryByRole("button", { name: "Вимкнути «Очима гравця»" })).toBeNull();

    fireEvent.click(screen.getByText("pick"));
    expect(screen.getByTestId("as-hero").textContent).toBe("me");

    fireEvent.click(screen.getByRole("button", { name: "Вимкнути «Очима гравця»" }));
    expect(screen.getByTestId("as-hero").textContent).toBe("off");
  });
});
