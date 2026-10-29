// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SlideGrid } from "../editor/SlideGrid";

vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: ({ alt }: { alt: string }) => <img alt={alt} /> }));

afterEach(cleanup);

const slides = [
  { id: "slide-0001", imageUrl: "https://x.supabase.co/a.webp", title: "Таверна", trackId: "t1" },
  { id: "slide-0002", imageUrl: "https://x.supabase.co/b.webp" },
];

describe("SlideGrid", () => {
  it("номер, заголовок, значок треку; стрілки шлють move, крайні вимкнені", () => {
    const dispatch = vi.fn();

    render(<SlideGrid slides={slides} actions={{ dispatch, edit: vi.fn() }} />);

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("Таверна")).toBeTruthy();
    expect(screen.getAllByLabelText("show.grid.hasTrack")).toHaveLength(1);

    expect((screen.getAllByRole("button", { name: "show.grid.moveLeft" })[0] as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByRole("button", { name: "show.grid.moveRight" })[1] as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getAllByRole("button", { name: "show.grid.moveRight" })[0]);
    expect(dispatch).toHaveBeenCalledWith({ type: "move", id: "slide-0001", dir: 1 });

    fireEvent.click(screen.getAllByRole("button", { name: "show.grid.remove" })[1]);
    expect(dispatch).toHaveBeenCalledWith({ type: "remove", id: "slide-0002" });
  });

  it("клік по мініатюрі — редагування слайда", () => {
    const edit = vi.fn();

    render(<SlideGrid slides={slides} actions={{ dispatch: vi.fn(), edit }} />);

    fireEvent.click(screen.getByRole("button", { name: 'show.slide {"index":2}' }));
    expect(edit).toHaveBeenCalledWith("slide-0002");
  });
});
