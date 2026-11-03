// @vitest-environment happy-dom
import type { TooltipRenderProps } from "react-joyride";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoTourTooltip } from "@/components/onboarding/DemoTourTooltip";

const button = (label: string, onClick: () => void) => ({ "aria-label": label, children: label, "data-action": label, onClick, role: "button", title: label });

function renderIt(overrides: Partial<Pick<TooltipRenderProps, "index" | "isLastStep" | "size">> = {}) {
  const handlers = { back: vi.fn(), close: vi.fn(), primary: vi.fn(), skip: vi.fn() };

  const props = {
    backProps: button("Назад", handlers.back),
    closeProps: button("Закрити тур", handlers.close),
    primaryProps: button("Далі", handlers.primary),
    skipProps: button("Пропустити тур", handlers.skip),
    tooltipProps: { "aria-modal": true, role: "alertdialog" },
    controls: {},
    continuous: true,
    index: 0,
    isLastStep: false,
    size: 2,
    step: { title: "Заголовок", content: "Опис кроку" },
    ...overrides,
  } as unknown as TooltipRenderProps;

  render(<DemoTourTooltip {...props} />);

  return handlers;
}

afterEach(cleanup);

describe("DemoTourTooltip", () => {
  it("shows the step text, progress and the controls for a first step", () => {
    const handlers = renderIt();

    expect(screen.getByRole("alertdialog").textContent).toContain("Заголовок");
    expect(screen.getByText("Опис кроку")).toBeTruthy();
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Назад" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Далі" }));
    fireEvent.click(screen.getByRole("button", { name: "Пропустити тур" }));
    fireEvent.click(screen.getByRole("button", { name: "Закрити тур" }));

    expect(handlers.primary).toHaveBeenCalledOnce();
    expect(handlers.skip).toHaveBeenCalledOnce();
    expect(handlers.close).toHaveBeenCalledOnce();
  });

  it("hides skip on the last step and shows back after the first", () => {
    const handlers = renderIt({ index: 1, isLastStep: true });

    expect(screen.queryByRole("button", { name: "Пропустити тур" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Назад" }));
    expect(handlers.back).toHaveBeenCalledOnce();
  });
});
