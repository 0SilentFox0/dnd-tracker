// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EntityIcon } from "@/components/common/EntityIcon";

describe("EntityIcon", () => {
  afterEach(cleanup);

  it("без src — перша літера назви великою", () => {
    render(<EntityIcon src={null} name="гоблін" />);

    expect(screen.getByText("Г")).toBeInTheDocument();
  });

  it("порожня назва — «?»", () => {
    render(<EntityIcon name="  " />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("з src — картинка; помилка завантаження — літера", () => {
    const { container } = render(<EntityIcon src="https://example.com/a.png" name="Меч" />);

    const img = container.querySelector("img");

    expect(img?.getAttribute("src")).toBe("https://example.com/a.png");
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("М")).toBeInTheDocument();
  });

  it("className перекриває розмір контейнера", () => {
    const { container } = render(<EntityIcon name="Меч" className="size-16 rounded-lg" />);

    expect(container.firstElementChild?.className).toContain("size-16");
    expect(container.firstElementChild?.className).not.toContain("size-10");
  });

  it("fallback замість літери, коли src немає, не URL або не завантажився", () => {
    const { container, rerender } = render(<EntityIcon src={null} name="Меч" fallback={<i data-testid="fb" />} />);

    expect(screen.getByTestId("fb")).toBeInTheDocument();

    rerender(<EntityIcon src="⚔️" name="Меч" fallback={<i data-testid="fb" />} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("fb")).toBeInTheDocument();
  });

  it("emoji: рядок, що не є URL, показується як текст", () => {
    const { container } = render(<EntityIcon src="⚔️" name="Меч" emoji />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("⚔️")).toBeInTheDocument();
  });
});
