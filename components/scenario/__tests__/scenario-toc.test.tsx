// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioToc, tocItems } from "@/components/scenario/ScenarioToc";
import type { ScenarioSection } from "@/types/scenario";

afterEach(cleanup);

const sections: ScenarioSection[] = [
  { id: "s1", title: "Підготовка", played: true, rows: [] },
  { id: "s2", title: "2.0 Два листи", played: false, rows: [] },
];

const drawer = { open: false, onOpenChange: vi.fn() };

describe("ScenarioToc", () => {
  it("tocItems: іконка, ✓ за правилом sectionDone", () => {
    expect(tocItems(sections, false)).toEqual([
      { id: "s1", title: "Підготовка", icon: "prep", done: true },
      { id: "s2", title: "2.0 Два листи", icon: "scene", done: false },
    ]);
  });

  it("inline: список з ✓ і поточним розділом; клік викликає onPick", () => {
    const onPick = vi.fn();

    const { container } = render(<ScenarioToc items={tocItems(sections, false)} inline drawer={drawer} onPick={onPick} />);

    expect(container.querySelector('[data-toc="s1"]')?.getAttribute("data-done")).toBe("true");
    fireEvent.click(screen.getByRole("link", { name: /2\.0 Два листи/ }));
    expect(onPick).toHaveBeenCalledWith("s2");
  });

  it("порожній список не падає", () => {
    const { container } = render(<ScenarioToc items={[]} inline drawer={drawer} />);

    expect(container.querySelector("nav")).not.toBeNull();
  });

  it("клік по пункту в панелі закриває панель", () => {
    const onOpenChange = vi.fn();

    render(<ScenarioToc items={tocItems(sections, false)} inline={false} drawer={{ open: true, onOpenChange }} onPick={vi.fn()} />);
    fireEvent.click(screen.getByRole("link", { name: /Підготовка/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("у висувній панелі перехід робиться після закриття (iOS vaul повертає прокрутку), панель — темна", () => {
    const onOpenChange = vi.fn();

    const target = document.createElement("section");

    target.id = "sec-s2";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);

      return 0;
    });

    render(<ScenarioToc items={tocItems(sections, false)} inline={false} drawer={{ open: true, onOpenChange }} onPick={vi.fn()} />);

    expect(document.querySelector(".sb-toc-drawer")?.getAttribute("data-theme")).toBe("dark");

    const link = screen.getByRole("link", { name: /2\.0 Два листи/ });

    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(location.hash).toBe("#sec-s2");

    raf.mockRestore();
    target.remove();
  });
});
