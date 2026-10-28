// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WorldPins } from "../WorldPins";

import type { WorldMarker } from "@/types/world";

afterEach(cleanup);

const zone = (id: string, x: number): WorldMarker => ({
  id, mapId: "m", kind: "zone", x, y: 0.5, polygon: [[x - 0.01, 0.49], [x + 0.01, 0.49], [x + 0.01, 0.51], [x - 0.01, 0.49]], name: id, icon: null, color: null, dmNote: null, alwaysVisible: false, sortOrder: 0, childMapId: null,
});

const point: WorldMarker = { ...zone("p", 0.9), kind: "point", polygon: null, icon: "city" };

const props = { selectedId: null, dragging: null, handlers: {}, onDragMove: () => {}, onDragEnd: () => {} };

describe("WorldPins compact mode", () => {
  it("raises the zoom threshold for pin labels", () => {
    const { container, rerender } = render(<WorldPins markers={[point]} zoom={3} {...props} />);

    expect(container.querySelector(".atlas-pin")?.getAttribute("data-labels")).toBe("true");

    rerender(<WorldPins markers={[point]} zoom={3} compact {...props} />);

    expect(container.querySelector(".atlas-pin")?.getAttribute("data-labels")).toBe("false");
  });

  it("hides overlapping zone labels", () => {
    const markers = [zone("A", 0.3), zone("B", 0.35)];

    const { container, rerender } = render(<WorldPins markers={markers} zoom={1} {...props} />);

    expect(container.querySelectorAll(".atlas-zone-label")).toHaveLength(2);

    rerender(<WorldPins markers={markers} zoom={1} compact {...props} />);

    expect(container.querySelectorAll(".atlas-zone-label")).toHaveLength(1);
  });
});
