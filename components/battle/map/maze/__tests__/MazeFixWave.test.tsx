// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MazeMarkPicker } from "../MazeMarkPicker";
import { MazeToolbar } from "../MazeToolbar";

import { emptyMaze } from "@/lib/constants/battle";
import { type MazeTools, MazeViewProvider, useMazeView } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { MazeConfig } from "@/types/battle";

afterEach(cleanup);

function scene(maze: Partial<MazeConfig> = {}, isDM = true) {
  const s = fakeScene({ isDM, map: testMap(8, 6, { maze: { ...emptyMaze(), exit: { x: 7, y: 0 }, ...maze } }) });

  s.me.battleData.position = { x: 1, y: 1 };

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <s.wrapper>
      <MazeViewProvider>{children}</MazeViewProvider>
    </s.wrapper>
  );

  return { ...s, Wrapper };
}

function ToolbarWithAsHero() {
  const { asHero } = useMazeView();

  const tools = { canGenerate: false, tool: "none", setTool: vi.fn(), dark: false, asHero, heroes: [{ id: "me", name: "Фрейда" }], toggleDark: vi.fn(), scatterStarts: vi.fn(), generate: vi.fn(), reshuffle: vi.fn() } as unknown as MazeTools;

  return (
    <>
      <span data-testid="as-hero">{asHero.id ?? "off"}</span>
      <MazeToolbar tools={tools} tall={false} />
      <button type="button" onClick={() => asHero.set("me")}>pick</button>
    </>
  );
}

describe("B1: «Очима гравця» завжди можна вимкнути", () => {
  it("після вибору героя є кнопка «Вимкнути», що повертає погляд ДМ", () => {
    const { Wrapper } = scene();

    render(<ToolbarWithAsHero />, { wrapper: Wrapper });

    expect(screen.queryByRole("button", { name: "Вимкнути «Очима гравця»" })).toBeNull();

    fireEvent.click(screen.getByText("pick"));
    expect(screen.getByTestId("as-hero").textContent).toBe("me");

    fireEvent.click(screen.getByRole("button", { name: "Вимкнути «Очима гравця»" }));
    expect(screen.getByTestId("as-hero").textContent).toBe("off");
  });
});

describe("B3: «Мітка» схована в темряві й для ДМ (десктоп)", () => {
  it("ДМ керує героєм у темряві — кнопки немає; при світлі — є", () => {
    const dark = scene({ dark: true });

    (dark.value.actions as unknown as Record<string, unknown>).mazeMark = { mutate: vi.fn(), isPending: false };
    render(<MazeMarkPicker hero={dark.me} />, { wrapper: dark.Wrapper });
    expect(screen.queryByText("Мітка")).toBeNull();

    cleanup();

    const light = scene();

    (light.value.actions as unknown as Record<string, unknown>).mazeMark = { mutate: vi.fn(), isPending: false };
    render(<MazeMarkPicker hero={light.me} />, { wrapper: light.Wrapper });
    expect(screen.queryByText("Мітка")).not.toBeNull();
  });
});
