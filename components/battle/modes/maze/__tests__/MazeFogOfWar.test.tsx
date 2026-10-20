// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { hero, mazeMap, RO, viewOf } from "./maze-fixtures";

import { BattleMap } from "@/components/battle/map";

afterEach(cleanup);

vi.stubGlobal("ResizeObserver", RO);

const map = mazeMap({ walls: ["2:0:e", "2:1:e", "2:2:e", "2:3:e", "2:4:e", "2:5:e"] });

const people = [hero("me", { x: 1, y: 2 }, "e")];

describe("туман війни гравця", () => {
  it("чорна маска закриває все, крім клітинок поля зору", () => {
    const view = viewOf(map, people, "player")!;

    const { container } = render(<BattleMap map={map} participants={people} view={{ mode: view }} />);

    const cover = container.querySelector("[data-maze-fow]") as SVGRectElement;

    const id = cover.getAttribute("data-maze-fow")!;

    expect(cover.getAttribute("mask")).toBe(`url(#${id})`);
    expect(cover.getAttribute("fill")).toBe("#000");

    const mask = container.querySelector(`mask[id="${id}"]`) as SVGMaskElement;

    const holes = [...mask.querySelectorAll("[data-maze-visible]")].map((el) => el.getAttribute("data-maze-visible"));

    expect(new Set(holes)).toEqual(new Set(view.cells));
    expect(holes).toContain("1:2");
    expect(holes).not.toContain("4:2");
    expect(container.querySelector('[data-fx-cell="4:2"]')).not.toBeNull();
  });

  it("покрив лежить над клітинками й під стінами, не перехоплює кліки", () => {
    const { container } = render(<BattleMap map={map} participants={people} view={{ mode: viewOf(map, people, "player") }} />);

    const svg = container.querySelector("svg")!;

    const order = [...svg.querySelectorAll("[data-fx-cell], [data-maze-fow-layer], [data-maze-walls]")];

    const fow = order.findIndex((el) => el.hasAttribute("data-maze-fow-layer"));

    expect(order.findIndex((el) => el.hasAttribute("data-fx-cell"))).toBeLessThan(fow);
    expect(order.findIndex((el) => el.hasAttribute("data-maze-walls"))).toBeGreaterThan(fow);
    expect(container.querySelector("[data-maze-fow-layer]")?.getAttribute("pointer-events")).toBe("none");
  });

  it("ДМ і глядач — без туману війни", () => {
    const dm = render(<BattleMap map={map} participants={people} view={{ mode: viewOf(map, people, "dm") }} />);

    expect(dm.container.querySelector("[data-maze-fow]")).toBeNull();
    dm.unmount();

    const spectator = render(<BattleMap map={map} participants={people} view={{ mode: viewOf(map, [], "player") }} />);

    expect(spectator.container.querySelector("[data-maze-fow]")).toBeNull();
  });
});
