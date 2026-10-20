// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { edgeHitRect, MazeEdgeEditor } from "../MazeEdgeEditor";

import type { MazeEditing } from "@/lib/hooks/battle";
import { UNIT } from "@/lib/utils/battle/grid";

afterEach(cleanup);

function editor(over: Partial<MazeEditing> = {}) {
  const stroke = { begin: vi.fn(), enter: vi.fn(), end: vi.fn(), pending: new Set<string>(["0:0:s"]) };

  const editing: MazeEditing = { tool: "walls", stroke, picked: null, ...over };

  const view = render(
    <svg>
      <MazeEdgeEditor map={{ cols: 3, rows: 2 }} editing={editing} />
    </svg>,
  );

  return { ...view, stroke };
}

describe("MazeEdgeEditor", () => {
  it("по зоні на кожне внутрішнє ребро", () => {
    const { container } = editor();

    expect([...container.querySelectorAll("[data-maze-edge]")].map((el) => el.getAttribute("data-maze-edge")).sort()).toEqual(
      ["0:0:e", "0:0:s", "0:1:e", "1:0:e", "1:0:s", "1:1:e", "2:0:s"].sort(),
    );
  });

  it("зона ребра не дістає центру клітинки", () => {
    const r = edgeHitRect("0:0:e");

    expect(r.x).toBeGreaterThan(UNIT / 2);
    expect(r.width).toBeLessThanOrEqual(30);
    expect(r.y).toBeGreaterThan(0);
    expect(r.y + r.height).toBeLessThan(UNIT);
  });

  it("штрих: pointerdown → begin, наведення → enter, pointerup на вікні → end", () => {
    const { container, stroke } = editor();

    fireEvent.pointerDown(container.querySelector('[data-maze-edge="0:0:e"]')!, { button: 0 });
    fireEvent.pointerEnter(container.querySelector('[data-maze-edge="1:0:e"]')!);
    fireEvent.pointerUp(window);

    expect(stroke.begin).toHaveBeenCalledWith("0:0:e");
    expect(stroke.enter).toHaveBeenCalledWith("1:0:e");
    expect(stroke.end).toHaveBeenCalledTimes(1);
  });

  it("ребра штриха підсвічені", () => {
    const { container } = editor();

    expect([...container.querySelectorAll("[data-maze-pending]")].map((el) => el.getAttribute("data-maze-pending"))).toEqual(["0:0:s"]);
  });

  it("поза режимом стін — без зон ребер, але з підсвіткою вибраного телепорту", () => {
    const { container } = editor({ tool: "teleport", picked: { x: 1, y: 1 } });

    expect(container.querySelector("[data-maze-edge]")).toBeNull();
    expect(container.querySelector("[data-maze-picked]")).not.toBeNull();
  });
});
