// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MazeMarkPicker } from "../MazeMarkPicker";
import { mazeMap } from "./maze-fixtures";

import { MazeViewProvider } from "@/components/battle/modes/maze/MazeViewProvider";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { MazeConfig } from "@/types/battle";

afterEach(cleanup);

function setup(maze: Partial<MazeConfig> = {}, used = 0) {
  const scene = fakeScene({ map: mazeMap(maze) });

  scene.me.battleData.position = { x: 1, y: 1 };
  scene.me.battleData.movementUsed = used;
  (scene.value.actions as unknown as Record<string, unknown>).mazeMark = { mutate: scene.move, isPending: false };
  render(<MazeMarkPicker hero={scene.me} />, { wrapper: scene.wrapper });

  return scene;
}

describe("MazeMarkPicker", () => {
  it("7 символів; вибір викликає мутацію", () => {
    const scene = setup();

    fireEvent.click(screen.getByText("Мітка"));
    expect(screen.getAllByRole("button").length).toBe(8);

    fireEvent.click(screen.getByLabelText("Череп"));
    expect(scene.move).toHaveBeenCalledWith({ participantId: "me", symbol: "skull" });
  });

  it("не показується без кроків", () => {
    setup({}, 99);
    expect(screen.queryByText("Мітка")).toBeNull();
  });

  it("не показується в темряві", () => {
    setup({ dark: true });
    expect(screen.queryByText("Мітка")).toBeNull();
  });

  it("ДМ керує героєм у темряві — кнопки немає; при світлі — є", () => {
    const shown = (dark: boolean) => {
      const s = fakeScene({ isDM: true, map: mazeMap({ exit: { x: 7, y: 0 }, dark }) });

      s.me.battleData.position = { x: 1, y: 1 };
      (s.value.actions as unknown as Record<string, unknown>).mazeMark = { mutate: vi.fn(), isPending: false };
      render(
        <s.wrapper>
          <MazeViewProvider>
            <MazeMarkPicker hero={s.me} />
          </MazeViewProvider>
        </s.wrapper>,
      );

      const found = screen.queryByText("Мітка") !== null;

      cleanup();

      return found;
    };

    expect(shown(true)).toBe(false);
    expect(shown(false)).toBe(true);
  });
});
