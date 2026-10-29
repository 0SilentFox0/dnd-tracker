// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SlideDialog } from "../editor/SlideDialog";

vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));
vi.mock("../editor/TrackPicker", () => ({ TrackPicker: () => null }));

afterEach(cleanup);

const slide = { id: "slide-0001", imageUrl: "https://x.supabase.co/a.webp", kind: "puzzle" as const, puzzle: { cut: "classic" as const, count: 24, seed: 1, imageWidth: 800, imageHeight: 600 } };

function open() {
  const dispatch = vi.fn();

  render(<SlideDialog campaignId="c1" slide={{ slide, index: 0 }} actions={{ dispatch, close: vi.fn() }} />);

  return dispatch;
}

describe("SlideDialog: пазл", () => {
  it("показує прев'ю нарізки", () => {
    open();

    expect(screen.getByLabelText("show.puzzle.preview")).toBeTruthy();
  });

  it("cut, count і «Перемішати» потрапляють у update", () => {
    const dispatch = open();

    fireEvent.click(screen.getByRole("button", { name: "show.slideDialog.cuts.organic" }));
    fireEvent.change(screen.getByLabelText("show.slideDialog.piecesLabel"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "show.slideDialog.shuffle" }));
    fireEvent.click(screen.getByRole("button", { name: "show.slideDialog.done" }));

    const { puzzle } = dispatch.mock.calls[0][0].patch;

    expect(puzzle).toMatchObject({ cut: "organic", count: 40 });
    expect(puzzle.seed).not.toBe(1);
  });
});
