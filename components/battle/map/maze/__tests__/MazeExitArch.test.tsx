// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mazeMap, RO, viewOf } from "./maze-fixtures";

import { BattleMap } from "@/components/battle/map";

afterEach(() => {
  cleanup();
  RO.size = { width: 800, height: 600 };
});

vi.stubGlobal("ResizeObserver", RO);

const edges = [
  { x: 3, y: 5 },
  { x: 3, y: 0 },
  { x: 0, y: 2 },
  { x: 7, y: 2 },
];

const arch = (c: HTMLElement) => c.querySelector("[data-maze-exit]")?.getAttribute("transform") ?? "";

describe("арка виходу", () => {
  it.each(edges)("стоїть прямо на десктопі для виходу %o", (exit) => {
    const map = mazeMap({ exit }, 8, 6);

    const { container } = render(<BattleMap map={map} participants={[]} view={{ maze: viewOf(map, [], "dm") }} />);

    expect(arch(container)).not.toBe("");
    expect(arch(container)).not.toContain("rotate");
  });

  it("на повернутій карті телефона обертається назад", () => {
    RO.size = { width: 300, height: 600 };

    const map = mazeMap({ exit: { x: 7, y: 2 } }, 8, 4);

    const { container } = render(<BattleMap map={map} participants={[]} view={{ maze: viewOf(map, [], "dm") }} phone />);

    expect(container.querySelector("[data-map-rotated]")).not.toBeNull();
    expect(arch(container)).toContain("rotate(-90)");
  });
});
