// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellIcon } from "@/components/spells/SpellIcon";

vi.mock("next/image", () => ({ default: ({ src, onError }: { src: string; onError?: () => void }) => <img data-testid="spell-img" src={src} onError={onError} alt="" /> }));

describe("SpellIcon", () => {
  afterEach(cleanup);

  it("без іконки — значок школи в кольорі школи", () => {
    const { container } = render(<SpellIcon spell={{ icon: null, spellGroup: { icon: "skull", color: "#5f8a3c" } }} size={30} />);

    const svg = container.querySelector("svg.lucide-skull");

    expect(svg).not.toBeNull();
    expect(svg).toHaveStyle({ color: "#5f8a3c" });
  });

  it("HOMM-ключ школи дає той самий значок, що й список шкіл", () => {
    const { container } = render(<SpellIcon spell={{ spellGroup: { icon: "moon", color: "#123456" } }} size={30} />);

    expect(container.querySelector("svg.lucide-moon")).not.toBeNull();
  });

  it("без школи — Sparkles", () => {
    const { container } = render(<SpellIcon spell={{ icon: "", spellGroup: null }} size={30} />);

    expect(container.querySelector("svg.lucide-sparkles")).not.toBeNull();
  });

  it("з іконкою — зображення; бита URL — значок школи", () => {
    const { container, getByTestId } = render(<SpellIcon spell={{ icon: "https://x.test/a.png", spellGroup: { icon: "eye", color: "#c9b458" } }} size={30} />);

    expect(getByTestId("spell-img").getAttribute("src")).toBe("https://x.test/a.png");

    fireEvent.error(getByTestId("spell-img"));

    expect(container.querySelector("svg.lucide-eye")).not.toBeNull();
  });
});
