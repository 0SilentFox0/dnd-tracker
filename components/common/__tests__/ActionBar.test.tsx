// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionBar } from "@/components/common/ActionBar";
import { FormCard } from "@/components/common/FormCard";

describe("ActionBar", () => {
  afterEach(cleanup);

  it("на телефоні прилипає донизу з safe-area, з sm — звичайний рядок", () => {
    render(<ActionBar><button>Зберегти</button></ActionBar>);

    const bar = screen.getByRole("button", { name: "Зберегти" }).parentElement as HTMLElement;

    expect(bar.dataset.slot).toBe("action-bar");
    expect(bar.className).toMatch(/(^| )sticky( |$)/);
    expect(bar.className).toContain("safe-area-inset-bottom");
    expect(bar.className).toContain("sm:static");
  });

  it("FormCard: submitDisabled вимикає кнопку, але підпис не «Збереження...»", () => {
    render(<FormCard title="Раса" onSubmit={vi.fn()} submitLabel="Зберегти" submitDisabled>поля</FormCard>);

    const btn = screen.getByRole("button", { name: "Зберегти" });

    expect(btn).toBeDisabled();
    expect(screen.queryByText("Збереження...")).toBeNull();
  });
});
