// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "@/components/character-profile/__tests__/sheet-fixture";
import { systemUiOf } from "@/components/systems";
import { parseRules } from "@/lib/utils/rules/schema";
import { MoraleField } from "@/systems/morale/ui/MoraleField";
import { MoraleRow } from "@/systems/morale/ui/MoraleRow";

describe("morale ui slots", () => {
  afterEach(cleanup);

  it("dnd5e without the module has neither the form field nor the sheet row", () => {
    const ui = systemUiOf("dnd5e", []);

    expect(ui.forms?.fields ?? []).toHaveLength(0);
    expect(ui.sheet?.combatRows ?? []).toHaveLength(0);
  });

  it("dnd5e + morale and the homm preset have both", () => {
    for (const ui of [systemUiOf("dnd5e", ["morale"]), systemUiOf("homm")]) {
      expect(ui.forms?.fields).toHaveLength(1);
      expect(ui.sheet?.combatRows).toHaveLength(1);
    }
  });

  it("the field takes its cap from rules.morale and hides when morale is off", () => {
    const combatStats = { data: { morale: 0 }, set: vi.fn() } as never;

    const { unmount } = render(<MoraleField combatStats={combatStats} rules={parseRules({ morale: { enabled: true, cap: 5 } })} />);

    const input = screen.getByLabelText("gameTerms.stats.moral") as HTMLInputElement;

    expect([input.min, input.max]).toEqual(["-5", "5"]);
    unmount();

    render(<MoraleField combatStats={combatStats} rules={parseRules({ morale: { enabled: false, cap: 5 } })} />);

    expect(screen.queryByLabelText("gameTerms.stats.moral")).toBeNull();
  });

  it("the row shows the sheet morale unless the rule is off", () => {
    const { unmount } = render(<MoraleRow sheet={{ ...sheetFixture, morale: 2 }} rules={parseRules({})} />);

    expect(screen.getByText("+2")).toBeTruthy();
    unmount();

    render(<MoraleRow sheet={{ ...sheetFixture, morale: 2 }} rules={parseRules({ morale: { enabled: false, cap: 3 } })} />);

    expect(screen.queryByText("+2")).toBeNull();
  });
});
