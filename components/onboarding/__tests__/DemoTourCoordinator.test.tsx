// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ joyrideProps: null as null | Record<string, unknown>, setFlag: vi.fn(), push: vi.fn() }));

vi.mock("react-joyride", () => ({
  ACTIONS: { COMPLETE: "complete", SKIP: "skip" },
  EVENTS: { TOUR_END: "tour:end", TOOLTIP: "tooltip", TARGET_NOT_FOUND: "error:target_not_found" },
  STATUS: { FINISHED: "finished", SKIPPED: "skipped" },
}));
vi.mock("next/dynamic", () => ({
  default: () => (props: Record<string, unknown>) => {
    mocks.joyrideProps = props;

    return null;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/hooks/onboarding", () => ({ useSetOnboardingFlag: () => mocks.setFlag }));
vi.mock("@/lib/i18n/use-translator", () => ({ useTranslator: () => (key: string) => key }));

import { ACTIONS, EVENTS, STATUS } from "react-joyride";

import { DemoTourCoordinator, useDemoTour } from "@/components/onboarding/DemoTourCoordinator";

function Launcher() {
  const { startTour } = useDemoTour();

  return <button type="button" onClick={() => startTour("dashboard")}>launch</button>;
}

function ScenarioLauncher() {
  const { startTour } = useDemoTour();

  return <button type="button" onClick={() => startTour("scenario")}>launch scenario</button>;
}

function renderCoordinator() {
  return render(<DemoTourCoordinator campaignId="c"><Launcher /></DemoTourCoordinator>);
}

function emit(type: string, index: number, status: string, action: string) {
  const onEvent = mocks.joyrideProps?.onEvent as (event: unknown) => void;

  onEvent({ type, index, status, action, step: { id: `dashboard.${index === 1 ? "search" : "navigation"}` } });
}

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); mocks.joyrideProps = null; mocks.setFlag.mockClear(); mocks.push.mockClear(); });

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

  it("starts a route-changing tour immediately and its first step navigates before showing", async () => {
    render(<DemoTourCoordinator campaignId="c"><ScenarioLauncher /></DemoTourCoordinator>);
    fireEvent.click(screen.getByRole("button", { name: "launch scenario" }));

    const props = mocks.joyrideProps as { run: boolean; steps: { before?: () => Promise<void> }[] };

    expect(props.run).toBe(true);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(props.steps[0].before).toBeTypeOf("function");

    mocks.push.mockImplementation((path: string) => {
      window.history.pushState({}, "", path);

      const target = document.createElement("div");

      target.setAttribute("data-tour", "scenario.list");
      document.body.append(target);
    });

    await props.steps[0].before?.();

    expect(mocks.push).toHaveBeenCalledWith("/campaigns/c/dm/scenario");
    expect(document.querySelector('[data-tour="scenario.list"]')).toBeTruthy();
  });

  it("keeps the tour running after a route change", () => {
    const view = renderCoordinator();

    fireEvent.click(screen.getByRole("button", { name: "launch" }));
    expect((mocks.joyrideProps as { run: boolean }).run).toBe(true);

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
