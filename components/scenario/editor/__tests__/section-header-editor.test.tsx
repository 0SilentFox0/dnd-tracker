// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionHeaderEditor } from "@/components/scenario/editor/SectionHeaderEditor";
import type { ScenarioSection } from "@/types/scenario";

afterEach(cleanup);

const section: ScenarioSection = { id: "s1", title: "2.3 Орлине Гніздо", played: false, rows: [{ id: "r", story: { type: "doc", content: [] }, notes: { type: "doc", content: [] }, battleId: "b" }] };

const open = () => {
  const trigger = screen.getByRole("button", { name: /Іконка розділу/ });

  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
};

describe("SectionHeaderEditor", () => {
  it("показує автоматичну іконку і дозволяє обрати іншу або повернути авто", async () => {
    const onIcon = vi.fn();

    const actions = { onTitle: vi.fn(), onMove: vi.fn(), onRemove: vi.fn(), onIcon };

    const { container, rerender } = render(<SectionHeaderEditor section={section} actions={actions} />);

    expect(container.querySelector("[data-section-icon]")?.getAttribute("data-section-icon")).toBe("battle");
    open();
    fireEvent.click(await screen.findByRole("menuitem", { name: /Відпочинок/ }));
    expect(onIcon).toHaveBeenCalledWith("rest");

    rerender(<SectionHeaderEditor section={{ ...section, icon: "rest" }} actions={actions} />);
    open();
    fireEvent.click(await screen.findByRole("menuitem", { name: /Автоматично/ }));
    expect(onIcon).toHaveBeenLastCalledWith(undefined);
  });
});
