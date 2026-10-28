// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { unitFormTabs } from "@/components/units/form/UnitFormFields";
import type { UnitFormFieldsState } from "@/lib/hooks/units";

afterEach(cleanup);

const editor = (cr: number | null, change = vi.fn()): UnitFormFieldsState => ({ form: { data: { cr, statblock: { senses: { blindsight: 30 } }, spellcasting: { spells: [{ spellId: "breath", perBattle: 1, recharge: 5 }] } }, change }, options: { races: [], spells: [{ id: "breath", name: "Подих" }], fiveE: true }, abilities: { errors: 0 } }) as never;

describe("monster unit form", () => {
  it("adds statblock and grant tabs only for CR units", () => {
    expect(unitFormTabs({ campaignId: "c", editor: editor(2) }).map((t) => t.label)).toEqual(expect.arrayContaining(["Статблок", "Заклинання"]));
    expect(unitFormTabs({ campaignId: "c", editor: editor(null) }).map((t) => t.label)).not.toContain("Статблок");
  });

  it("edits senses without dropping the rest of the statblock", () => {
    const change = vi.fn();

    const tab = unitFormTabs({ campaignId: "c", editor: editor(2, change) }).find((t) => t.label === "Статблок");

    render(<>{tab?.content}</>);
    fireEvent.change(screen.getByLabelText("Сліпочуття, фт"), { target: { value: "60" } });
    expect(change).toHaveBeenCalledWith({ statblock: { senses: { blindsight: 60 } } });
  });

  it("shows grant usage and lets the DM change its per-battle limit", () => {
    const change = vi.fn();

    const tab = unitFormTabs({ campaignId: "c", editor: editor(2, change) }).find((t) => t.label === "Заклинання");

    render(<>{tab?.content}</>);
    expect(screen.getByText("Подих")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Подих: використань за бій"), { target: { value: "2" } });
    expect(change.mock.calls.at(-1)?.[0].spellcasting.spells[0]).toEqual({ spellId: "breath", perBattle: 2 });
  });
});
