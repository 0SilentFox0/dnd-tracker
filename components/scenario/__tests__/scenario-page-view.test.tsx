// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioPageView } from "@/components/scenario";
import type { ScenarioPage } from "@/types/scenario";

afterEach(cleanup);

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const page = (kind: ScenarioPage["kind"]): ScenarioPage => ({
  id: "p1", kind, arc: null, title: "Монастир Світла", subtitle: "Сцена перша", status: "ready", sortOrder: 0, characterId: null, version: 1, updatedAt: "",
  content: { legend: [{ kind: "read", label: "Читати вголос" }], sections: [{ id: "s10", title: "1.0 Собор", played: false, revealedAt: null, rows: [{ id: "r1", story: p("Дзвони"), notes: p("Шрам не пояснюй") }] }] },
});

describe("ScenarioPageView", () => {
  it("заголовок, легенда, розділ з якорем, story і notes", () => {
    const { container } = render(<ScenarioPageView page={page("scene")} campaignId="c" />);

    expect(screen.getByRole("heading", { level: 1, name: "Монастир Світла" })).toBeTruthy();
    expect(screen.getByText("Читати вголос")).toBeTruthy();
    expect(container.querySelector("section#sec-s10 h2")?.textContent).toContain("1.0 Собор");
    expect(container.querySelector(".row .story")?.textContent).toBe("Дзвони");
    expect(container.querySelector(".row aside.notes")?.textContent).toBe("Шрам не пояснюй");
  });

  it("кнопка «Зіграно» на сцені; «Відкрити гравцеві» на героєві", () => {
    const onPlayed = vi.fn();

    const onRevealed = vi.fn();

    const { rerender } = render(<ScenarioPageView page={page("scene")} campaignId="c" progress={{ onPlayed, onRevealed, pending: false }} />);

    fireEvent.click(screen.getByRole("button", { name: /Зіграно/ }));
    expect(onPlayed).toHaveBeenCalledWith("s10", true);

    rerender(<ScenarioPageView page={page("hero")} campaignId="c" progress={{ onPlayed, onRevealed, pending: false }} />);
    fireEvent.click(screen.getByRole("button", { name: /Відкрити гравцеві/ }));
    expect(onRevealed).toHaveBeenCalledWith("s10", true);
  });
});
