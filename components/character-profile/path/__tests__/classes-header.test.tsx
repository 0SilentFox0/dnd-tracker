// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassesHeader, ClassSection } from "@/components/character-profile/path";
import { makeClass } from "@/lib/utils/characters/classes/__tests__/class-fixtures";
import { buildClassProgression } from "@/lib/utils/characters/classes/progression";

const fighter = makeClass({ id: "f", name: "Fighter", color: null, features: [{ level: 4, abilities: [], choices: [{ id: "asi4", label: "ASI", level: 4, count: 1, kind: "feat" }] }] });

const wizard = makeClass({ id: "w", name: "Wizard", color: null, features: [] });

const two = [buildClassProgression(fighter, { classId: "f", level: 4 }), buildClassProgression(wizard, { classId: "w", level: 2 })];

describe("ClassesHeader", () => {
  afterEach(cleanup);

  it("shows the total level and the split by class", () => {
    render(<ClassesHeader progressions={two} maxLevel={20} />);

    expect(screen.getByText(/"level":6,"split":"Fighter 4 \/ Wizard 2"/)).toBeTruthy();
  });

  it("shows open picks only when there are some", () => {
    render(<ClassesHeader progressions={two} maxLevel={20} />);

    expect(screen.getByText('characterProfile.path.openPicks {"count":1}')).toBeTruthy();
    cleanup();
    render(<ClassesHeader progressions={[two[1]]} maxLevel={20} />);

    expect(screen.queryByText(/openPicks/)).toBeNull();
  });

  it("the add-class button needs a handler and a level below the maximum", () => {
    const onAddClass = vi.fn();

    render(<ClassesHeader progressions={two} maxLevel={20} />);

    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    render(<ClassesHeader progressions={two} maxLevel={6} onAddClass={onAddClass} />);

    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    render(<ClassesHeader progressions={two} maxLevel={20} onAddClass={onAddClass} />);
    fireEvent.click(screen.getByRole("button"));

    expect(onAddClass).toHaveBeenCalledOnce();
  });
});

describe("ClassSection", () => {
  afterEach(cleanup);

  it("title carries class, level and chosen subclass; open follows defaultOpen", () => {
    const { container, rerender } = render(<ClassSection progression={two[0]} defaultOpen>x</ClassSection>);

    expect(container.querySelector("details")?.open).toBe(true);
    expect(screen.getByText("Fighter")).toBeTruthy();
    expect(screen.getByText('characterProfile.path.sectionLevel {"level":4}')).toBeTruthy();
    rerender(<ClassSection progression={two[0]} defaultOpen={false}>x</ClassSection>);

    expect(container.querySelector("details")?.open).toBe(true);
  });

  it("starts closed, opens when defaultOpen turns on, and keeps the user's own toggle", () => {
    const { container, rerender } = render(<ClassSection progression={two[0]} defaultOpen={false}>x</ClassSection>);

    const details = container.querySelector("details") as HTMLDetailsElement;

    expect(details.open).toBe(false);
    rerender(<ClassSection progression={two[0]} defaultOpen>x</ClassSection>);

    expect(details.open).toBe(true);

    details.open = false;
    fireEvent(details, new Event("toggle"));
    rerender(<ClassSection progression={two[0]} defaultOpen>x</ClassSection>);

    expect(details.open).toBe(false);
  });
});
