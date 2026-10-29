// @vitest-environment happy-dom
import { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleFormMap } from "@/components/battle/setup/BattleFormMap";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { useBattleMapEditor } from "@/lib/hooks/battles/setup/useBattleMapEditor";
import { emptyMaze } from "@/lib/utils/battle/modes/maze/constants";

vi.mock("next/image", () => ({ default: ({ src }: { src: string }) => <i data-bg={src} /> }));
vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useImageSize: (src: string | null) => (src ? { width: 1980, height: 1200 } : null) }));
vi.stubGlobal(
  "ResizeObserver",
  class {
    constructor(private cb: (e: { contentRect: { width: number; height: number } }[]) => void) {}
    observe() {
      this.cb([{ contentRect: { width: 800, height: 600 } }]);
    }
    disconnect() {}
    unobserve() {}
  },
);

const seen = vi.hoisted(() => ({ editor: null as unknown as ReturnType<typeof import("@/lib/hooks/battles/setup/useBattleMapEditor").useBattleMapEditor> }));

function Harness() {
  const editor = useBattleMapEditor(null);

  useEffect(() => {
    seen.editor = editor;
  });

  return (
    <ConfirmProvider>
      <BattleFormMap editor={editor} />
    </ConfirmProvider>
  );
}

afterEach(cleanup);

const drawingHidden = () => (screen.getByText("battleSetup.map.drawing").parentElement as HTMLElement).hidden;

describe("перемикач «Лабіринт»", () => {
  it("без карти перемикача немає", () => {
    render(<Harness />);

    expect(screen.queryByRole("switch", { name: "battleDm.maze.title" })).toBeNull();
  });

  it("вмикання дає map.maze = emptyMaze() і ховає палітру місцевості", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("switch", { name: "battleSetup.map.enabled" }));

    expect(screen.getByText("battleSetup.map.drawing")).toBeTruthy();

    fireEvent.click(screen.getByRole("switch", { name: "battleDm.maze.title" }));

    expect(seen.editor.state.value?.maze).toEqual(emptyMaze());
    expect(drawingHidden()).toBe(true);

    fireEvent.click(screen.getByRole("switch", { name: "battleDm.maze.title" }));

    expect(seen.editor.state.value?.maze).toBeNull();
    expect(drawingHidden()).toBe(false);
  });
});
