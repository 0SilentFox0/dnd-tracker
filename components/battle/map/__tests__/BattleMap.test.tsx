// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleMap } from "@/components/battle/map";
import { GridShape } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

afterEach(cleanup);

class RO {
  observe() {}
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal("ResizeObserver", RO);

const base = createMockParticipant();

function at(id: string, x: number, y: number): BattleParticipant {
  return { ...base, basicInfo: { ...base.basicInfo, id, name: id, avatar: undefined }, battleData: { ...base.battleData, position: { x, y } } };
}

const square: BattleMapConfig = { grid: GridShape.SQUARE, cols: 4, rows: 3, background: null, opacity: 0.3 };

const people = [at("h", 0, 0), at("e", 3, 2)];

describe("BattleMap", () => {
  it("renders cells and tokens", () => {
    const { container } = render(<BattleMap map={square} participants={people} />);

    expect(container.querySelectorAll("polygon")).toHaveLength(12);
    expect(container.querySelector('[data-fx-participant="h"]')).not.toBeNull();
    expect(container.querySelector('[data-fx-participant="e"]')).not.toBeNull();
  });

  it("cell click reports the point", () => {
    const onCellClick = vi.fn();

    const { container } = render(<BattleMap map={square} participants={people} actions={{ onCellClick }} />);

    fireEvent.click(container.querySelectorAll("polygon")[5]);
    expect(onCellClick).toHaveBeenCalledWith({ x: 1, y: 1 });
  });

  it("token click does not click the cell", () => {
    const onCellClick = vi.fn();

    const onTokenClick = vi.fn();

    const { container } = render(<BattleMap map={square} participants={people} actions={{ onCellClick, onTokenClick }} />);

    fireEvent.click(container.querySelector('[data-fx-participant="h"]') as Element);
    expect(onTokenClick).toHaveBeenCalledWith("h");
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("colors marked cells", () => {
    const { container } = render(<BattleMap map={square} participants={people} view={{ marks: new Map([["0:0", "target"]]) }} />);

    expect(container.querySelectorAll("polygon")[0].getAttribute("fill")).toBe("rgba(230,80,60,.35)");
  });

  it("renders hex cells with six vertices", () => {
    const { container } = render(<BattleMap map={{ ...square, grid: GridShape.HEX }} participants={people} />);

    const polygons = container.querySelectorAll("polygon");

    expect(polygons).toHaveLength(12);
    expect(polygons[0].getAttribute("points")?.split(" ")).toHaveLength(6);
  });
});
