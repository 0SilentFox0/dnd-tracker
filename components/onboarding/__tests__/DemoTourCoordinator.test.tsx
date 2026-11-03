// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ joyrideProps: null as null | Record<string, unknown>, setFlag: vi.fn(), push: vi.fn(), pathname: "/campaigns/c" }));

vi.mock("react-joyride", () => ({
  ACTIONS: { COMPLETE: "complete", SKIP: "skip" },
  EVENTS: { TOUR_END: "tour:end", TOOLTIP: "tooltip", TARGET_NOT_FOUND: "error:target_not_found" },
  STATUS: { FINISHED: "finished", SKIPPED: "skipped" },
}));
vi.mock("next/dynamic", () => ({ default: () => (props: Record<string, unknown>) => { mocks.joyrideProps = props; return null; } }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/hooks/onboarding", () => ({ useSetOnboardingFlag: () => mocks.setFlag }));
vi.mock("@/lib/i18n/use-translator", () => ({ useTranslator: () => (key: string) => key }));

import { ACTIONS, EVENTS, STATUS } from "react-joyride";

import { DemoTourCoordinator, useDemoTour } from "@/components/onboarding/DemoTourCoordinator";

function Launcher() {
  const { startTour } = useDemoTour();

  return <button type="button" onClick={() => startTour("dashboard")}>launch</button>;
}

function renderCoordinator() {
  return render(<DemoTourCoordinator campaignId="c"><Launcher /></DemoTourCoordinator>);
}

function emit(type: string, index: number, status: string, action: string) {
  const onEvent = mocks.joyrideProps?.onEvent as (event: unknown) => void;

  onEvent({ type, index, status, action, step: { id: `dashboard.${index === 1 ? "search" : "navigation"}` } });
}

afterEach(() => { cleanup(); mocks.joyrideProps = null; mocks.setFlag.mockClear(); mocks.push.mockClear(); mocks.pathname = "/campaigns/c"; });

describe("DemoTourCoordinator", () => {
  it("starts the selected tour and supplies active-locale steps and controls", () => {
    renderCoordinator();
    fireEvent.click(screen.getByRole("button", { name: "launch" }));

    const props = mocks.joyrideProps as { run: boolean; steps: { title: string; content: string }[]; locale: { skip: string }; options: { overlayClickAction: boolean; closeButtonAction: string } };

    expect(props.run).toBe(true);
    expect(props.steps).toHaveLength(2);
    expect(props.steps[0]).toMatchObject({ title: "demoTours.steps.dashboard.navigation.title", content: "demoTours.steps.dashboard.navigation.description" });
    expect(props.locale.skip).toBe("demoTours.controls.skip");
    expect(props.options.overlayClickAction).toBe(false);
    expect(props.options.closeButtonAction).toBe("skip");
  });

  it("keeps the tour running after navigation leaves its start route", () => {
    const view = renderCoordinator();

    fireEvent.click(screen.getByRole("button", { name: "launch" }));
    expect((mocks.joyrideProps as { run: boolean }).run).toBe(true);

    mocks.pathname = "/campaigns/c/dm/scenario/scene-1";
    view.rerender(<DemoTourCoordinator campaignId="c"><Launcher /></DemoTourCoordinator>);

    expect((mocks.joyrideProps as { run: boolean }).run).toBe(true);
  });

  it("persists completion only after the last step is shown and finished", () => {
    renderCoordinator();
    fireEvent.click(screen.getByRole("button", { name: "launch" }));
    emit(EVENTS.TOOLTIP, 1, STATUS.FINISHED, ACTIONS.COMPLETE);
    emit(EVENTS.TOUR_END, 1, STATUS.FINISHED, ACTIONS.COMPLETE);

    expect(mocks.setFlag).toHaveBeenCalledWith("demo-tour:dashboard", "complete");
  });

  it.each([
    ["skipped", STATUS.SKIPPED, ACTIONS.SKIP],
    ["closed", STATUS.SKIPPED, ACTIONS.SKIP],
  ])("does not complete a tour when it is %s", (_name, status, action) => {
    renderCoordinator();
    fireEvent.click(screen.getByRole("button", { name: "launch" }));
    emit(EVENTS.TOUR_END, 0, status, action);

    expect(mocks.setFlag).not.toHaveBeenCalled();
  });

  it("does not complete when the final target is missing", () => {
    renderCoordinator();
    fireEvent.click(screen.getByRole("button", { name: "launch" }));
    emit(EVENTS.TARGET_NOT_FOUND, 1, STATUS.FINISHED, ACTIONS.COMPLETE);
    emit(EVENTS.TOUR_END, 1, STATUS.FINISHED, ACTIONS.COMPLETE);

    expect(mocks.setFlag).not.toHaveBeenCalled();
  });
});
