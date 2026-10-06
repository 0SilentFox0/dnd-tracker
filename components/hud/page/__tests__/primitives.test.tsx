// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HudCard, HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";

afterEach(cleanup);

describe("HUD page primitives", () => {
  it("HudPage carries the HUD surface and page classes", () => {
    const { container } = render(<HudPage>x</HudPage>);

    expect(container.firstElementChild?.className).toContain("hud-surface");
    expect(container.firstElementChild?.className).toContain("hud-page");
  });

  it("HudPageHeader renders title, subtitle and wrapping actions", () => {
    render(<HudPageHeader title="Юніти" subtitle="Всього: 3" actions={<button>Створити</button>} />);

    expect(screen.getByRole("heading", { name: "Юніти" })).toBeTruthy();
    expect(screen.getByText("Всього: 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Створити" }).parentElement?.className).toContain("flex-wrap");
  });

  it("HudCard applies tone and accent", () => {
    const { container } = render(<HudCard tone="active" accent="#ff0000">x</HudCard>);

    const el = container.firstElementChild as HTMLElement;

    expect(el.dataset.tone).toBe("active");
    expect(el.style.borderLeftColor).toMatch(/^(#ff0000|rgb\(255, 0, 0\))$/);
  });

  it("HudChipTabs: buttons expose aria-pressed and links aria-current", () => {
    const onSelect = vi.fn();

    render(
      <>
        <HudChipTabs ariaLabel="Раси" items={[{ key: "a", label: "Гобліни · 1", active: true, onSelect }]} />
        <HudChipTabs ariaLabel="Тип" items={[{ key: "n", label: "NPC-герої", href: "/x?type=npc", active: true }]} />
      </>,
    );

    expect(screen.getByRole("button", { name: "Гобліни · 1" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Гобліни · 1" }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "NPC-герої" }).getAttribute("aria-current")).toBe("page");
  });
});
