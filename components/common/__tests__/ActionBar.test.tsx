// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActionBar } from "@/components/common/ActionBar";

describe("ActionBar", () => {
  afterEach(cleanup);

  it("на телефоні прилипає донизу з safe-area, з sm — звичайний рядок", () => {
    render(<ActionBar><button>Зберегти</button></ActionBar>);

    const bar = screen.getByRole("button", { name: "Зберегти" }).parentElement as HTMLElement;

    expect(bar.dataset.slot).toBe("action-bar");
    expect(bar.className).toMatch(/(^| )sticky( |$)/);
    expect(bar.className).toContain("safe-area-inset-bottom");
    expect(bar.className).toContain("sm:static");
    // must not overhang Card/Form padding on phones
    expect(bar.className).not.toMatch(/(^| )-mx-/);
  });
});
