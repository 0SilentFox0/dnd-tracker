// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityChips, pickAfterRemove } from "@/components/abilities/AbilityChips";
import type { Ability } from "@/lib/utils/abilities/schema";

const ab = (id: string, name: string): Ability => ({ id, name, trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] });

describe("pickAfterRemove", () => {
  it("picks right neighbour, then left, then null", () => {
    expect(pickAfterRemove(["a", "b", "c"], 1)).toBe("c");
    expect(pickAfterRemove(["a", "b", "c"], 2)).toBe("b");
    expect(pickAfterRemove(["a"], 0)).toBeNull();
  });
});

describe("AbilityChips", () => {
  afterEach(cleanup);

  it("marks selected and invalid chips and adds", () => {
    const onAdd = vi.fn();

    const onSelect = vi.fn();

    render(<AbilityChips abilities={[ab("a", "Лють"), ab("b", "Кровотеча")]} selectedId="a" invalidIds={new Set(["b"])} onSelect={onSelect} onAdd={onAdd} />);

    expect(screen.getByRole("tab", { name: /Лють/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Кровотеча/ }).querySelector("[data-invalid-dot]")).not.toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Кровотеча/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
    expect(onAdd).toHaveBeenCalled();
  });
});
