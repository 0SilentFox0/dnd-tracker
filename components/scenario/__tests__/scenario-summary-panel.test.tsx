// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioSummaryPanel } from "@/components/scenario";
import { render } from "@/components/ui/__tests__/uk-intl";
import { useGenerateScenarioSummary, useScenarioSummaries } from "@/lib/hooks/scenario";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/scenario", () => ({ useScenarioSummaries: vi.fn(), useGenerateScenarioSummary: vi.fn() }));

const generate = vi.fn();

const entry = (stale: boolean) => ({
  summary: { overview: "Загальний огляд", events: ["Подія один"], secrets: ["Таємниця"], entities: ["unit:u1"], digest: "d" },
  version: 1,
  stale,
  model: "m",
  createdAt: "2026-10-30",
});

const setup = (data: { available: boolean; stale?: boolean; has?: boolean }, gen: { pendingPageId?: string | null; error?: string | null } = {}) => {
  vi.mocked(useScenarioSummaries).mockReturnValue({ isPending: false, data: { available: data.available, summaries: data.has ? { p1: entry(!!data.stale) } : {} } } as never);
  vi.mocked(useGenerateScenarioSummary).mockReturnValue({ generate, pendingPageId: gen.pendingPageId ?? null, error: gen.error ?? null });

  return render(<ScenarioSummaryPanel campaignId="c1" pageId="p1" />);
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ScenarioSummaryPanel", () => {
  it("shows Generate when there is no summary", () => {
    setup({ available: true });
    fireEvent.click(screen.getByRole("button", { name: "Згенерувати" }));
    expect(generate).toHaveBeenCalledWith("p1", false);
  });

  it("renders overview, events and secrets with Refresh", () => {
    setup({ available: true, has: true });
    expect(screen.getByText("Загальний огляд")).toBeTruthy();
    expect(screen.getByText("Подія один")).toBeTruthy();
    expect(screen.getByText("Таємниця")).toBeTruthy();
    expect(screen.queryByText("unit:u1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Оновити" }));
    expect(generate).toHaveBeenCalledWith("p1", true);
  });

  it("shows the stale badge", () => {
    setup({ available: true, has: true, stale: true });
    expect(screen.getByText(/Застарів/)).toBeTruthy();
  });

  it("disables the button with a hint when AI is unavailable", () => {
    setup({ available: false });
    expect((screen.getByRole("button", { name: "Згенерувати" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Потрібен ключ AI/)).toBeTruthy();
  });

  it("disables the button while generating", () => {
    setup({ available: true }, { pendingPageId: "p1" });
    expect((screen.getByRole("button", { name: /Генерую/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the error text", () => {
    setup({ available: true }, { error: "Збій моделі" });
    expect(screen.getByRole("alert").textContent).toBe("Збій моделі");
  });
});
