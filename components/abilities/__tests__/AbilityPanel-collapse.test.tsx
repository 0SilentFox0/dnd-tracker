// @vitest-environment happy-dom
import { useState } from "react";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityPanel } from "../AbilityPanel";
import { DEFAULT_CONDITION } from "../ConditionEditor";
import { AbilityEditorProvider } from "../editor-context";

import type { Ability } from "@/lib/utils/abilities/schema";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: vi.fn() });

const empty: Ability = { id: "a1", name: "X", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] };

const rich: Ability = { ...empty, trigger: { event: "action" }, condition: DEFAULT_CONDITION, limits: { perBattle: 2 } };

function Harness({ initial, errors = {} }: { initial: Ability; errors?: Record<string, { message: string }[]> }) {
  const [ability, setAbility] = useState(initial);

  return (
    <AbilityEditorProvider value={{ errorsByPath: errors } as never}>
      <AbilityPanel ability={ability} path="abilities.0" actions={{ onChange: setAbility, onRemove: () => {} }} />
    </AbilityEditorProvider>
  );
}

const toggle = (part: string) => within(document.getElementById(`abilities.0-section-${part}`) as HTMLElement).getAllByRole("button")[0];

afterEach(cleanup);

describe("AbilityPanel collapsible sections", () => {
  it("opens only trigger and effects for an empty ability", () => {
    render(<Harness initial={empty} />);

    expect(toggle("when").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("then").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("if").getAttribute("aria-expanded")).toBe("false");
    expect(toggle("limits").getAttribute("aria-expanded")).toBe("false");
  });

  it("opens condition and limits when present", () => {
    render(<Harness initial={rich} />);

    expect(toggle("if").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("limits").getAttribute("aria-expanded")).toBe("true");
  });

  it("toggles on header click and removes collapsed content from the DOM", () => {
    render(<Harness initial={empty} />);

    expect(document.getElementById("abilities.0-section-when-body")).not.toBeNull();
    fireEvent.click(toggle("when"));
    expect(toggle("when").getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("abilities.0-section-when-body")).toBeNull();
  });

  it("shows a one-line summary when collapsed and a dash when empty", () => {
    render(<Harness initial={rich} />);
    fireEvent.click(toggle("limits"));

    expect(toggle("limits").textContent).toContain("limits");

    cleanup();
    render(<Harness initial={empty} />);

    expect(toggle("if").textContent).toContain("abilities.panel.emptySummary");
  });

  it("adds a default condition and opens the section from the header plus", () => {
    render(<Harness initial={empty} />);
    fireEvent.click(within(document.getElementById("abilities.0-section-if") as HTMLElement).getByLabelText("abilities.condition.add"));

    expect(toggle("if").getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("abilities.0-section-if-body")?.children.length).toBeGreaterThan(0);
  });

  it("opens sections that have validation errors", () => {
    render(<Harness initial={empty} errors={{ "abilities.0.condition.x": [{ message: "m" }], "abilities.0.limits.perBattle": [{ message: "m" }] }} />);

    expect(toggle("if").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("limits").getAttribute("aria-expanded")).toBe("true");
  });

  it("opens a collapsed section from its flow chip and highlights it after a frame", async () => {
    const { container } = render(<Harness initial={rich} />);

    fireEvent.click(toggle("limits"));
    fireEvent.click(container.querySelector('[data-part="limits"]') as HTMLElement);

    expect(toggle("limits").getAttribute("aria-expanded")).toBe("true");

    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))));

    const section = document.getElementById("abilities.0-section-limits") as HTMLElement;

    expect(document.activeElement).toBe(section);
    expect(section.classList.contains("bg-hud-gold/15")).toBe(true);
  });

  it("renders the limits shell in both the passive and regular branch", () => {
    const { unmount } = render(<Harness initial={empty} />);

    expect(toggle("limits").textContent).toContain("abilities.limits.title");
    unmount();
    render(<Harness initial={rich} />);

    expect(toggle("limits").textContent).toContain("abilities.limits.title");
  });
});
