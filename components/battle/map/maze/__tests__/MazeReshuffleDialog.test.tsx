// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MazeReshuffleDialog } from "@/components/battle/map/maze/MazeReshuffleDialog";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

afterEach(cleanup);

describe("MazeReshuffleDialog", () => {
  it("режим «1 тунель» ховає лічильники й надсилає mode: tunnel", async () => {
    const onSubmit = vi.fn();

    render(<MazeReshuffleDialog open onOpenChange={() => {}} onSubmit={onSubmit} />);

    expect(screen.getByLabelText("Пари телепортів")).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole("combobox"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "1 тунель" }));

    expect(screen.queryByLabelText("Пари телепортів")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Перетасувати" }));

    expect(onSubmit).toHaveBeenCalledWith("tunnel", expect.objectContaining({ teleportPairs: expect.any(Number) }));
  });
});
