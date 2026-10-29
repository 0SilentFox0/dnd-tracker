// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldHeroes } from "../WorldHeroes";

import { render } from "@/components/ui/__tests__/uk-intl";
import type { WorldHero } from "@/types/world";

vi.unmock("next-intl");

// eslint-disable-next-line @next/next/no-img-element
vi.mock("next/image", () => ({ default: (p: { alt: string }) => <img alt={p.alt} /> }));

afterEach(cleanup);

const hero = (o: Partial<WorldHero>): WorldHero => ({ id: "h", name: "Арвен", avatar: null, mapId: "map", x: 0.5, y: 0.5, own: false, ...o });

const box = { width: 800, height: 600 };

describe("WorldHeroes", () => {
  it("marks the own hero and reports clicks", () => {
    const onHeroClick = vi.fn();

    render(<WorldHeroes zoom={2} box={box} heroes={[hero({ id: "a", name: "Арвен", own: true, x: 0.2 }), hero({ id: "b", name: "Борін", x: 0.8 })]} onHeroClick={onHeroClick} />);

    expect(screen.getByRole("button", { name: "Арвен" }).dataset.own).toBe("true");
    expect(screen.getByRole("button", { name: "Арвен" }).style.transform).toContain("scale(0.5)");

    fireEvent.pointerUp(screen.getByRole("button", { name: "Борін" }));

    expect(onHeroClick).toHaveBeenCalledWith("b");
  });

  it("falls back to the initial for a non-image avatar string", () => {
    render(<WorldHeroes zoom={1} box={box} heroes={[hero({ name: "Арвен", avatar: "not-an-url" })]} />);

    expect(screen.getByRole("button", { name: "Арвен" }).textContent).toBe("А");
  });

  it("collapses heroes on one point into a single marker with a +N badge", () => {
    render(<WorldHeroes zoom={1} box={box} heroes={[hero({ id: "a", name: "Арвен" }), hero({ id: "b", name: "Борін" }), hero({ id: "c", name: "Ґрім" })]} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Арвен і ще 2" }).textContent).toContain("+2");
  });

  it("puts the own hero on top of a cluster", () => {
    render(<WorldHeroes zoom={1} box={box} heroes={[hero({ id: "a", name: "Арвен" }), hero({ id: "b", name: "Борін", own: true })]} />);

    expect(screen.getByRole("button", { name: "Борін і ще 1" }).dataset.own).toBe("true");
  });

  it("opens the list on click and picking a name reports that hero", () => {
    const onHeroClick = vi.fn();

    render(<WorldHeroes zoom={1} box={box} heroes={[hero({ id: "a", name: "Арвен" }), hero({ id: "b", name: "Борін" })]} onHeroClick={onHeroClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Арвен і ще 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Борін/ }));

    expect(onHeroClick).toHaveBeenCalledWith("b");
  });

  it("separates the same heroes again after zooming in", () => {
    const heroes = [hero({ id: "a", name: "Арвен", x: 0.5 }), hero({ id: "b", name: "Борін", x: 0.51 })];

    const { rerender } = render(<WorldHeroes zoom={1} box={box} heroes={heroes} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);

    rerender(<WorldHeroes zoom={4} box={box} heroes={heroes} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("only clusters the heroes it is given (hidden ones were filtered upstream)", () => {
    render(<WorldHeroes zoom={1} box={box} heroes={[hero({ id: "a", name: "Арвен", own: true })]} />);

    expect(screen.getByRole("button", { name: "Арвен" })).toBeTruthy();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});
