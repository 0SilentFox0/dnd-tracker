// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ghostOf } from "@/components/battle/fx/runtime/ghosts";
import { cancelLayer, stageFor } from "@/components/battle/fx/runtime/stage";

const fakeCtx = { setTransform: vi.fn(), clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), drawImage: vi.fn() };

beforeEach(() => {
  document.body.innerHTML = "";
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx as unknown as CanvasRenderingContext2D);
});

describe("ghostOf", () => {
  it("copies the row under the canvas without anchors, ids or canvases, and cancelLayer removes it", () => {
    const layer = document.createElement("div");

    const row = document.createElement("div");

    row.dataset.fxParticipant = "t";
    row.innerHTML = `<span id="name" data-fx-participant="t">Огр</span><canvas></canvas>`;
    document.body.append(row, layer);

    const stage = stageFor(layer);

    const ghost = ghostOf(stage, row, "grayscale(1)");

    expect(ghost?.nextElementSibling).toBe(stage.canvas);
    expect(ghost?.textContent).toBe("Огр");
    expect(ghost?.querySelectorAll("[data-fx-participant], [id], canvas")).toHaveLength(0);
    expect(ghost?.hasAttribute("data-fx-participant")).toBe(false);
    expect(document.querySelectorAll('[data-fx-participant="t"]')).toHaveLength(2);

    cancelLayer(layer);

    expect(layer.querySelector(".fx-ghost")).toBeNull();
  });
});
