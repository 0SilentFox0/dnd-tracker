// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { compendiumStep,CompendiumSteps } from "../CompendiumSteps";

import { StepIndicator } from "@/components/common/StepIndicator";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";

type State = CompendiumImportController["state"];

const state = (patch: Partial<State>) => ({ root: null, preview: null, rights: false, result: null, ...patch }) as State;

afterEach(cleanup);

describe("compendiumStep", () => {
  it("виводить крок зі стану екрана", () => {
    expect(compendiumStep(state({}))).toBe(0);
    expect(compendiumStep(state({ root: {} }))).toBe(1);
    expect(compendiumStep(state({ root: {}, preview: {} as State["preview"] }))).toBe(2);
    expect(compendiumStep(state({ preview: {} as State["preview"], rights: true }))).toBe(3);
    expect(compendiumStep(state({ result: {} as State["result"] }))).toBe(4);
  });
});

describe("CompendiumSteps", () => {
  it("рендерить чотири кроки з поточним", () => {
    render(<CompendiumSteps wizard={{ state: state({ root: {} }) } as CompendiumImportController} />);

    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(4);
    expect(items.map((li) => li.getAttribute("data-state"))).toEqual(["done", "current", "todo", "todo"]);
    expect(items[1].getAttribute("aria-current")).toBe("step");
    expect(screen.getByText("compendium.import.steps.categories")).toBeTruthy();
  });
});

describe("StepIndicator", () => {
  it("усі кроки виконані, коли current дорівнює довжині", () => {
    render(<StepIndicator label="l" steps={["a", "b"]} current={2} />);

    expect(screen.getAllByRole("listitem").every((li) => li.getAttribute("data-state") === "done")).toBe(true);
  });
});
