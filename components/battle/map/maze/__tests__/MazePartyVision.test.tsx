// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enemy, hero, mazeMap, RO, viewOf } from "./maze-fixtures";

import { BattleMap } from "@/components/battle/map";
import { mazeVision, unionVision, viewpointOf } from "@/lib/utils/battle/modes/maze";

afterEach(cleanup);

vi.stubGlobal("ResizeObserver", RO);

const map = mazeMap({ walls: ["3:1:e", "3:2:e", "3:3:e"], exit: { x: 7, y: 5 } });

const a = hero("a", { x: 1, y: 2 }, "e");

const b = hero("b", { x: 6, y: 4 }, "w", "u2");

const foe = enemy("foe", { x: 5, y: 0 });

const people = [a, b, foe];

const seen = (c: HTMLElement) => [...c.querySelectorAll("[data-maze-seen]")].map((el) => el.getAttribute("data-maze-seen")).sort();

describe("ДМ бачить поле зору загону", () => {
  it("підсвічені клітинки — об'єднання поля зору всіх героїв на полі", () => {
    const { container } = render(<BattleMap map={map} participants={people} view={{ maze: viewOf(map, people, "dm") }} />);

    const grid = { cols: map.cols, rows: map.rows, maze: map.maze! };

    const expected = [...unionVision(grid, [a, b].map((h) => viewpointOf(h)!))].sort();

    expect(seen(container)).toEqual(expected);
    expect(expected.length).toBeGreaterThan(mazeVision(grid, viewpointOf(a)!).size);
  });

  it("гравець цього шару не бачить", () => {
    const { container } = render(<BattleMap map={map} participants={people} view={{ maze: viewOf(map, people, "player") }} />);

    expect(container.querySelector("[data-maze-party-vision]")).toBeNull();
  });

  it("стіни лабіринту чорні", () => {
    const css = readFileSync(join(process.cwd(), "components/battle/map/battle-map.css"), "utf8");

    expect(css).toMatch(/--maze-wall:\s*#000;/);
  });
});
