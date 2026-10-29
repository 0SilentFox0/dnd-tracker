// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityPanel } from "../AbilityPanel";
import { AbilityEditorProvider } from "../editor-context";

import type { Ability } from "@/lib/utils/abilities/schema";

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, scrollIntoView: vi.fn() });

const initial: Ability = { id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] };

function Harness() {
  const [ability, setAbility] = useState(initial);

  return (
    <AbilityEditorProvider value={{ errorsByPath: {} } as never}>
      <AbilityPanel ability={ability} path="abilities.0" actions={{ onChange: setAbility, onRemove: () => {} }} />
    </AbilityEditorProvider>
  );
}

afterEach(cleanup);

describe("AbilityPanel flow", () => {
  it("shows flow chips that follow the trigger select", async () => {
    const { container } = render(<Harness />);

    expect(container.querySelector('[data-part="when"]')?.textContent).toContain("triggers.passive.label");

    fireEvent.pointerDown(screen.getByLabelText("abilities.trigger.event"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "abilityRegistry.triggers.turnStart.label" }));

    expect(container.querySelector('[data-part="when"]')?.textContent).toContain("triggers.turnStart.label");
  });

  it("scrolls the matching section into view and highlights it on chip click", () => {
    const { container } = render(<Harness />);

    fireEvent.click(container.querySelector('[data-part="then"]') as HTMLElement);

    const section = document.getElementById("abilities.0-section-then") as HTMLElement;

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(section.classList.contains("bg-hud-gold/15")).toBe(true);
  });

  it("keeps a single highlight when chips are clicked in quick succession", () => {
    vi.useFakeTimers();

    const { container, unmount } = render(<Harness />);

    fireEvent.click(container.querySelector('[data-part="when"]') as HTMLElement);
    fireEvent.click(container.querySelector('[data-part="then"]') as HTMLElement);

    const when = document.getElementById("abilities.0-section-when") as HTMLElement;

    const then = document.getElementById("abilities.0-section-then") as HTMLElement;

    expect(when.classList.contains("bg-hud-gold/15")).toBe(false);
    expect(then.classList.contains("bg-hud-gold/15")).toBe(true);
    expect(container.querySelector('[data-part="then"]')?.getAttribute("aria-controls")).toBe("abilities.0-section-then");

    vi.advanceTimersByTime(1300);

    expect(then.classList.contains("bg-hud-gold/15")).toBe(false);

    fireEvent.click(container.querySelector('[data-part="when"]') as HTMLElement);
    unmount();

    expect(when.classList.contains("bg-hud-gold/15")).toBe(false);
    vi.useRealTimers();
  });
});
