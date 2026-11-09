// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacteristicsGrid } from "../CharacteristicsGrid";

import { signed } from "@/lib/utils/common/format";
import type { SheetWfrpBlock } from "@/lib/utils/rules/systems";
import { CHARACTERISTIC_KEYS } from "@/lib/utils/rules/systems";

const block = {
  characteristics: CHARACTERISTIC_KEYS.map((key, i) => ({ key, base: 30 + i, advances: 5, value: 35 + i, bonus: Math.floor((35 + i) / 10), mod: i === 0 ? -10 : 0 })),
} as SheetWfrpBlock;

describe("CharacteristicsGrid", () => {
  afterEach(cleanup);

  it("renders ten chips with value and bonus", () => {
    render(<CharacteristicsGrid block={block} onRoll={() => {}} canRoll />);

    expect(screen.getAllByRole("button")).toHaveLength(10);
    expect(screen.getByText("35")).toBeTruthy();
    expect(screen.getByText("44")).toBeTruthy();
  });

  it("shows the mutation modifier only when non-zero", () => {
    render(<CharacteristicsGrid block={block} onRoll={() => {}} canRoll />);

    expect(screen.getAllByText(signed(-10))).toHaveLength(1);
  });

  it("a click requests a characteristic test", () => {
    const onRoll = vi.fn();

    render(<CharacteristicsGrid block={block} onRoll={onRoll} canRoll />);
    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(onRoll).toHaveBeenCalledWith(expect.objectContaining({ subject: { kind: "test", characteristic: "ws" } }));
  });

  it("is not clickable without roll permission", () => {
    render(<CharacteristicsGrid block={block} onRoll={() => {}} canRoll={false} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
