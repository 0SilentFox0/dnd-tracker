// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { ImageUpload } from "@/components/ui/image-upload";

describe("ImageUpload", () => {
  afterEach(cleanup);

  it("картинка з файлу: поле URL порожнє, прев'ю і позначка файлу", () => {
    const { container } = renderWithConfirm(<ImageUpload label="Іконка" value="data:image/png;base64,AAAA" onChange={vi.fn()} fallbackText="Дракон" />);

    expect(screen.getByLabelText("Іконка")).toHaveValue("");
    expect(container.querySelector("img")).not.toBeNull();
    expect(screen.getByText("common.ui.fromFile")).toBeTruthy();
  });

  it("невалідний URL — підказка і літера фолбеку", () => {
    renderWithConfirm(<ImageUpload label="Іконка" value="abc" onChange={vi.fn()} fallbackText="Дракон" />);

    expect(screen.getByText("common.iconUrl.invalid")).toBeTruthy();
    expect(screen.getByText("Д")).toBeTruthy();
  });

  it("allowFile={false} — без кнопки файлу", () => {
    renderWithConfirm(<ImageUpload label="Іконка" value="" onChange={vi.fn()} allowFile={false} />);

    expect(screen.queryByRole("button", { name: /common.ui.uploadFromComputer/ })).toBeNull();
  });
});
