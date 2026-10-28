// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityEditorProvider } from "../editor-context";
import { LimitsSection } from "../sections/LimitsSection";

afterEach(cleanup);

const ability = { id: "a", name: "Expend", trigger: { event: "action" as const }, effects: [{ kind: "note" as const, text: "x" }] };

describe("LimitsSection: item charges", () => {
  it("an item with charges offers «spend item charges»", () => {
    const onChange = vi.fn();

    render(
      <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {}, itemCharges: true }}>
        <LimitsSection ability={ability} path="0" onChange={onChange} />
      </AbilityEditorProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Витрачає заряди предмета" }));

    expect(onChange).toHaveBeenLastCalledWith({ ...ability, limits: { pool: { key: "charges", cost: 1 } } });
  });

  it("without item charges the control is absent", () => {
    render(
      <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {} }}>
        <LimitsSection ability={ability} path="0" onChange={vi.fn()} />
      </AbilityEditorProvider>,
    );

    expect(screen.queryByRole("checkbox", { name: "Витрачає заряди предмета" })).toBeNull();
  });
});
