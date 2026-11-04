// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ joyrideProps: null as null | Record<string, unknown>, setFlag: vi.fn(), push: vi.fn() }));

vi.mock("react-joyride", () => ({
  ACTIONS: { UPDATE: "update", SKIP: "skip" },
  EVENTS: { TOUR_END: "tour:end", TOOLTIP: "tooltip", TARGET_NOT_FOUND: "error:target_not_found" },
  STATUS: { FINISHED: "finished", RUNNING: "running", SKIPPED: "skipped" },
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

const LAST = 7;

function renderCoordinator() {
  return render(<DemoTourCoordinator campaignId="c"><Launcher /></DemoTourCoordinator>);
}

function emit(type: string, index: number, status: string, action: string) {
  const onEvent = mocks.joyrideProps?.onEvent as (event: unknown) => void;

  onEvent({ type, index, status, action, step: { id: `dashboard.${index === LAST ? "summary" : "header"}` } });
}

afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); mocks.joyrideProps = null; mocks.setFlag.mockClear(); mocks.push.mockClear(); });

describe("DemoTourCoordinator", () => {
  it("starts the selected tour and supplies active-locale steps and controls", () => {
    renderCoordinator();
    fireEvent.click(screen.getByRole("button", { name: "launch" }));

    const props = mocks.joyrideProps as { run: boolean; steps: { title: string; content: string }[]; locale: { skip: string }; options: { overlayClickAction: boolean; closeButtonAction: string; skipBeacon: boolean } };

    expect(props.run).toBe(true);
    expect(props.steps).toHaveLength(LAST + 1);
    expect(props.steps[0]).toMatchObject({ title: "steps.dashboard.header.title", content: "steps.dashboard.header.description", placement: "bottom" });
    expect(props.steps[LAST]).toMatchObject({ placement: "left" });
    expect(props.locale.skip).toBe("controls.skip");
    expect(props.options.overlayClickAction).toBe(false);
    expect(props.options.closeButtonAction).toBe("skip");
    expect(props.options.skipBeacon).toBe(true);
    expect((mocks.joyrideProps as { options: { scrollOffset: number } }).options.scrollOffset).toBeGreaterThanOrEqual(89);
    expect((mocks.joyrideProps as { tooltipComponent: unknown }).tooltipComponent).toBeTypeOf("function");
    expect((mocks.joyrideProps as { styles: { overlay: { backgroundColor: string } } }).styles.overlay.backgroundColor).toBe("rgba(0, 0, 0, 0.78)");
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

      target.setAttribute("data-tour", "scenario.search");
      document.body.append(target);
    });

    await props.steps[0].before?.();

    expect(mocks.push).toHaveBeenCalledWith("/campaigns/c/dm/scenario");
    expect(document.querySelector('[data-tour="scenario.search"]')).toBeTruthy();
    document.querySelector('[data-tour="scenario.search"]')?.remove();
  });

  it("centers a step whose target is taller than the viewport", async () => {
    render(<DemoTourCoordinator campaignId="c"><ScenarioLauncher /></DemoTourCoordinator>);
    fireEvent.click(screen.getByRole("button", { name: "launch scenario" }));

    window.history.pushState({}, "", "/campaigns/c/dm/scenario");

    const target = document.createElement("div");

    target.setAttribute("data-tour", "scenario.search");
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    target.getBoundingClientRect = () => ({ height: 5000 } as DOMRect);
    document.body.append(target);

    const stepsBefore = (mocks.joyrideProps as { steps: { placement: string; before?: () => Promise<void> }[] }).steps;

    expect(stepsBefore[0].placement).toBe("bottom");

    await act(() => stepsBefore[0].before?.());

    expect((mocks.joyrideProps as { steps: { placement: string }[] }).steps[0].placement).toBe("center");
    target.remove();
  });

  it("activates the click anchor before waiting for the target and tolerates a missing one", async () => {
    const World = () => {
      const { startTour } = useDemoTour();

      return <button type="button" onClick={() => startTour("world")}>launch world</button>;
    };

    render(<DemoTourCoordinator campaignId="c"><World /></DemoTourCoordinator>);
    fireEvent.click(screen.getByRole("button", { name: "launch world" }));
    window.history.pushState({}, "", "/campaigns/c/world");

    const steps = (mocks.joyrideProps as { steps: { id: string; before?: () => Promise<void> }[] }).steps;

    const notes = steps.find((step) => step.id === "world.notes")!;

    const marker = document.createElement("button");

    marker.setAttribute("data-tour", "world.marker");
    marker.addEventListener("pointerup", () => {
      const panel = document.createElement("div");

      panel.setAttribute("data-tour", "world.notes");
      document.body.append(panel);
    });
    document.body.append(marker);

    await notes.before?.();

    expect(document.querySelector('[data-tour="world.notes"]')).toBeTruthy();
    marker.remove();
    document.querySelector('[data-tour="world.notes"]')?.remove();

    // відсутнє джерело: крок не падає, лише чекає на ціль
    const places = document.createElement("div");

    places.setAttribute("data-tour", "world.places");
    document.body.append(places);
    await expect(steps.find((step) => step.id === "world.places")!.before?.()).resolves.toBeUndefined();
    places.remove();
  });

  it("repeats the click until the target appears when a step asks for it", async () => {
    const Battle = () => {
      const { startTour } = useDemoTour();

      return <button type="button" onClick={() => startTour("battle")}>launch battle</button>;
    };

    render(<DemoTourCoordinator campaignId="c"><Battle /></DemoTourCoordinator>);
    fireEvent.click(screen.getByRole("button", { name: "launch battle" }));
    window.history.pushState({}, "", "/campaigns/c/battles/b1");

    const next = document.createElement("button");

    let clicks = 0;

    next.setAttribute("data-tour", "battle.next-turn");
    next.addEventListener("click", () => {
      clicks += 1;

      if (clicks === 3) {
        const grid = document.createElement("div");

        grid.setAttribute("data-tour", "battle.turn-controls");
        document.body.append(grid);
      }
    });
    document.body.append(next);

    const step = (mocks.joyrideProps as { steps: { id: string; before?: () => Promise<void> }[] }).steps.find((item) => item.id === "battle.turn-controls")!;

    await step.before?.();

    expect(clicks).toBe(3);
    next.remove();
    document.querySelector('[data-tour="battle.turn-controls"]')?.remove();
  }, 15000);

  it("scrolls an off-screen target into view before the step is shown", async () => {
    render(<DemoTourCoordinator campaignId="c"><ScenarioLauncher /></DemoTourCoordinator>);
    fireEvent.click(screen.getByRole("button", { name: "launch scenario" }));
    window.history.pushState({}, "", "/campaigns/c/dm/scenario");

    const target = document.createElement("div");

    const scrolled = vi.fn();

    target.setAttribute("data-tour", "scenario.search");
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    target.getBoundingClientRect = () => ({ top: 2400, bottom: 2440, height: 40 } as DOMRect);
    target.scrollIntoView = scrolled;
    document.body.append(target);

    await (mocks.joyrideProps as { steps: { before?: () => Promise<void> }[] }).steps[0].before?.();

    expect(scrolled).toHaveBeenCalledWith({ block: "center", behavior: "instant" });
    target.remove();
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
    emit(EVENTS.TOOLTIP, LAST, STATUS.RUNNING, ACTIONS.UPDATE);
    emit(EVENTS.TOUR_END, LAST, STATUS.FINISHED, ACTIONS.UPDATE);

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
    emit(EVENTS.TARGET_NOT_FOUND, LAST, STATUS.RUNNING, ACTIONS.UPDATE);
    emit(EVENTS.TOUR_END, LAST, STATUS.FINISHED, ACTIONS.UPDATE);

    expect(mocks.setFlag).not.toHaveBeenCalled();
  });
});
