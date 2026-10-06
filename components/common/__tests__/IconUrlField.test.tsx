// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { IconUrlField } from "@/components/common/IconUrlField";

const HINT = "Вкажіть посилання, що починається з https:// або http://";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);

  return <IconUrlField label="Іконка" value={value} onChange={setValue} fallbackText="Вогняна куля" />;
}

describe("IconUrlField", () => {
  afterEach(cleanup);

  it("порожнє поле — літера фолбеку, без підказки", () => {
    render(<Harness />);

    expect(screen.getByText("В")).toBeInTheDocument();
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it("невалідний URL — підказка і літера замість картинки", () => {
    const { container } = render(<Harness />);

    fireEvent.change(screen.getByLabelText("Іконка"), { target: { value: "abc" } });

    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByLabelText("Іконка")).toHaveAttribute("aria-invalid", "true");
  });

  it("валідний URL — прев'ю картинкою", () => {
    const { container } = render(<Harness />);

    fireEvent.change(screen.getByLabelText("Іконка"), { target: { value: "https://example.com/i.png" } });

    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.com/i.png");
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it("data URL із файлу — поле порожнє, прев'ю є", () => {
    const { container } = render(<Harness initial="data:image/png;base64,AAAA" />);

    expect(screen.getByLabelText("Іконка")).toHaveValue("");
    expect(container.querySelector("img")).not.toBeNull();
    expect(screen.queryByText(HINT)).toBeNull();
  });
});
