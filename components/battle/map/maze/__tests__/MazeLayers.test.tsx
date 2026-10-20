// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enemy, hero, mazeMap, RO, viewOf } from "./maze-fixtures";

import { BattleMap } from "@/components/battle/map";
import { InitiativeTrack } from "@/components/battle/participants/InitiativeTrack";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { cellPolygon } from "@/lib/utils/battle/grid";

afterEach(() => {
  cleanup();
  RO.size = { width: 800, height: 600 };
});

vi.stubGlobal("ResizeObserver", RO);

const walls = ["1:1:e", "1:2:e", "5:1:s", "0:4:e"];

const map = mazeMap({ walls, teleports: [[{ x: 2, y: 2 }, { x: 0, y: 0 }]], exit: { x: 7, y: 5 }, fog: ["6:5"] });

const me = hero("me", { x: 2, y: 2 }, "e");

const sleeper = enemy("zzz", { x: 4, y: 2 }, { dormant: true });

const hidden = enemy("far", { x: 0, y: 5 });

const out = { ...hero("gone", { x: 7, y: 5 }, "e", "u2"), battleData: { ...hero("gone", { x: 7, y: 5 }).battleData, escaped: true } };

const people = [me, sleeper, hidden, out];

const ids = (c: HTMLElement) => [...c.querySelectorAll("[data-map-tokens] [data-fx-participant]")].map((el) => el.getAttribute("data-fx-participant"));

describe("шари лабіринту", () => {
  it("ДМ бачить усі стіни, лінії телепортів, сплячих напівпрозорими й не бачить тих, хто вибрався", () => {
    const { container } = render(<BattleMap map={map} participants={people} view={{ maze: viewOf(map, people, "dm") }} />);

    expect(container.querySelectorAll("[data-maze-wall]")).toHaveLength(walls.length);
    expect(container.querySelectorAll("[data-maze-link]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-maze-teleport]")).toHaveLength(2);
    expect(container.querySelector("[data-maze-exit]")).not.toBeNull();
    expect(container.querySelector('[data-maze-fog="6:5"]')).not.toBeNull();
    expect(container.querySelector("[data-maze-fow]")).toBeNull();
    expect(ids(container).sort()).toEqual(["far", "me", "zzz"]);
    expect(container.querySelector('[data-fx-participant="zzz"]')?.closest("[data-dormant]")).not.toBeNull();
    expect(container.querySelector('[data-fx-participant="me"]')?.closest("[data-dormant]")).toBeNull();
  });

  it("гравець: лише стіни на межі поля зору, без лінії телепорту, лише видимі токени", () => {
    const view = viewOf(map, people, "player")!;

    const { container } = render(<BattleMap map={map} participants={people} view={{ maze: view }} />);

    const shown = walls.filter(view.showWalls);

    expect(shown.length).toBeLessThan(walls.length);
    expect([...container.querySelectorAll("[data-maze-wall]")].map((el) => el.getAttribute("data-maze-wall"))).toEqual(shown);
    expect(container.querySelector("[data-maze-link]")).toBeNull();
    expect([...container.querySelectorAll("[data-maze-teleport]")].map((el) => el.getAttribute("data-maze-teleport"))).toEqual(["2:2"]);
    expect(container.querySelector("[data-maze-exit]")).toBeNull();
    expect(ids(container).sort()).toEqual(["me", "zzz"]);
    expect(container.querySelector('[data-fx-participant="zzz"]')?.closest("[data-dormant]")).not.toBeNull();
  });

  it("мітки гравців — символ його кольору лише в полі зору", () => {
    const marked = { ...map, maze: { ...map.maze!, marks: { "3:2": { symbol: "skull" as const, color: "#ff0000", by: "me" }, "0:5": { symbol: "star" as const, color: "#00ff00", by: "x" } } } };

    const { container } = render(<BattleMap map={marked} participants={people} view={{ maze: viewOf(marked, people, "player") }} />);

    const marks = container.querySelectorAll("[data-maze-mark]");

    expect(marks).toHaveLength(1);
    expect(marks[0].getAttribute("data-maze-mark")).toBe("3:2");
    expect((marks[0] as SVGGElement).style.color).toBe("#ff0000");
  });

  it("телефон: стіна й клітинка в тому самому повернутому svg і збігаються за координатами", () => {
    RO.size = { width: 300, height: 600 };

    const wide = mazeMap({ walls: ["2:3:e"] }, 8, 4);

    const { container } = render(<BattleMap map={wide} participants={[]} view={{ maze: viewOf(wide, [], "dm") }} phone />);

    const layer = container.querySelector("[data-map-rotated]") as HTMLElement;

    const wall = layer.querySelector('svg [data-maze-wall="2:3:e"]') as SVGRectElement;

    const cell = layer.querySelector('svg [data-fx-cell="2:3"]') as SVGPolygonElement;

    expect(wall.closest("svg")).toBe(cell.closest("svg"));

    const corners = cellPolygon({ x: 2, y: 3 }).split(" ").map((pt) => pt.split(",").map(Number));

    const right = Math.max(...corners.map(([x]) => x));

    const [top, bottom] = [Math.min(...corners.map(([, y]) => y)), Math.max(...corners.map(([, y]) => y))];

    const n = (a: string) => Number(wall.getAttribute(a));

    expect(n("x") + n("width") / 2).toBe(right);
    expect(n("y")).toBeLessThanOrEqual(top);
    expect(n("y") + n("height")).toBeGreaterThanOrEqual(bottom);
  });

  it("темрява: гравець бачить лише свій токен і «Темрява»", () => {
    const dark = { ...map, maze: { ...map.maze!, dark: true } };

    const { container, getByText } = render(<BattleMap map={dark} participants={people} view={{ maze: viewOf(dark, people, "player") }} />);

    const screen = container.querySelector("[data-maze-dark]") as HTMLElement;

    expect(getByText("Темрява")).not.toBeNull();
    expect(screen.querySelectorAll(":scope > div > *")).toHaveLength(1);
  });

  it("ДМ у темряві бачить карту без чорного екрана", () => {
    const dark = { ...map, maze: { ...map.maze!, dark: true } };

    const { container } = render(<BattleMap map={dark} participants={people} view={{ maze: viewOf(dark, people, "dm") }} />);

    expect(container.querySelector("[data-maze-dark]")).toBeNull();
  });
});

describe("шкала ініціативи в лабіринті", () => {
  it("гравець бачить лише видимих учасників", () => {
    const scene = fakeScene({ map: mazeMap({ walls: ["1:0:e", "1:1:e", "1:2:e"] }) });

    scene.me.battleData.position = { x: 0, y: 1 };
    scene.me.battleData.facing = "w";
    scene.gob.battleData.position = { x: 5, y: 1 };
    scene.ally.battleData.position = { x: 6, y: 4 };

    const Wrapper = scene.wrapper;

    const { container } = render(
      <Wrapper>
        <InitiativeTrack />
      </Wrapper>,
    );

    const shown = [...container.querySelectorAll("[data-fx-participant]")].map((el) => el.getAttribute("data-fx-participant"));

    expect(shown).toContain("me");
    expect(shown).not.toContain("gob");
    expect(shown).not.toContain("ally");
  });
});
