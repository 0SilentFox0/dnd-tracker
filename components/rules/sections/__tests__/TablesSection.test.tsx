// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TablesSection } from "../TablesSection";

import "@/components/ui/__tests__/match-media";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_TABLES } from "@/lib/utils/rules/systems";
import type { TableRow } from "@/lib/utils/rules/tables-schema";

const mount = (tables: Record<string, TableRow[] | null> = {}) => {
  const set = vi.fn();

  render(<TablesSection form={{ campaignId: "c", data: { ...DEFAULT_RULES, tables }, set } as unknown as Parameters<typeof TablesSection>[0]["form"]} />);

  return set;
};

const custom: TableRow[] = [
  { max: 50, text: "a", effects: [{ type: "damage", amount: 2 }] },
  { max: 100, text: "b", effects: [] },
];

afterEach(cleanup);

describe("TablesSection", () => {
  it("shows the default rows for an unset slot", () => {
    mount();

    expect(screen.getByText("battleWfrp.crit.head.1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "wfrpTables.customize" })).toBeTruthy();
  });

  it("customize copies the defaults without textKey", () => {
    const set = mount();

    fireEvent.click(screen.getByRole("button", { name: "wfrpTables.customize" }));

    const next = set.mock.calls.at(-1)?.[1].critHead;

    expect(next).toHaveLength(DEFAULT_TABLES.critHead.length);
    expect(next[0]).toEqual({ max: 20, effects: [{ type: "damage", amount: 1 }], text: "battleWfrp.crit.head.1" });
  });

  it("adds an effect to a row", () => {
    const set = mount({ critHead: custom });

    fireEvent.click(screen.getAllByRole("button", { name: "wfrpTables.addEffect" })[1]);

    expect(set).toHaveBeenLastCalledWith("tables", { critHead: [custom[0], { max: 100, text: "b", effects: [{ type: "damage", amount: 1 }] }] });
  });

  it("removing a row keeps the last max at 100", () => {
    const set = mount({ critHead: custom });

    fireEvent.click(screen.getByRole("button", { name: /wfrpTables.removeRow.*1/ }));

    expect(set).toHaveBeenLastCalledWith("tables", { critHead: [{ max: 100, text: "b", effects: [] }] });
  });

  it("the last row max is locked and the first from is 1", () => {
    mount({ critHead: custom });

    expect((screen.getByLabelText(/wfrpTables.upTo.*2/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/wfrpTables.upTo.*1/) as HTMLInputElement).disabled).toBe(false);
  });

  it("offers only the effect types of the slot", () => {
    mount({ critHead: [{ max: 100, effects: [{ type: "damage", amount: 1 }] }] });

    fireEvent.keyDown(screen.getByRole("combobox", { name: "wfrpTables.effectType" }), { key: "Enter" });

    const options = screen.getAllByRole("option").map((o) => o.textContent);

    expect(options).toEqual(["wfrpTables.effect.damage", "wfrpTables.effect.condition", "wfrpTables.effect.marker"]);
  });

  it("reset sends null for the slot", () => {
    const set = mount({ critHead: custom });

    fireEvent.click(screen.getByRole("button", { name: "wfrpTables.reset" }));

    expect(set).toHaveBeenLastCalledWith("tables", { critHead: null });
  });
});
