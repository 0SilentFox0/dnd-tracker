// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import * as api from "@/lib/api/onboarding";

vi.mock("@/lib/api/onboarding", () => ({
  getOnboardingFlags: vi.fn(async () => ({ flags: {}, audiences: ["dm"] })),
  setOnboardingFlag: vi.fn(async () => ({ ok: true })),
  resetOnboarding: vi.fn(),
  getCampaignOnboarding: vi.fn(),
}));

const step = (id: string, done: boolean, optional = false) => ({ id, title: `Крок ${id}`, description: "опис", href: `/campaigns/c/${id}`, helpSlug: "dm-quickstart", optional, informational: false, done });

const renderIt = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

  return render(<OnboardingChecklist campaignId="c" />, { wrapper: Wrapper });
};

afterEach(cleanup);

beforeEach(() => vi.clearAllMocks());

describe("OnboardingChecklist", () => {
  it("open — прогрес, кроки, «Як це?» веде в довідку", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [step("a", true), step("b", false), step("x", false, true)], requiredDone: 1, requiredTotal: 2 });
    renderIt();

    expect(await screen.findByText("1/2")).toBeTruthy();
    expect(screen.getByText("Крок b")).toBeTruthy();
    expect(screen.getByText("Більше можливостей")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Як це?" })[0].getAttribute("href")).toBe("/help/dm-quickstart");
    expect(screen.getAllByRole("link", { name: "Перейти" })[0].getAttribute("href")).toBe("/campaigns/c/b");
  });

  it("collapsed — один рядок", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "collapsed", steps: [step("a", true)], requiredDone: 1, requiredTotal: 1 });
    renderIt();

    expect(await screen.findByText(/Перші кроки пройдено/)).toBeTruthy();
    expect(screen.queryByText("Крок a")).toBeNull();
  });

  it("«Сховати» прибирає панель", async () => {
    vi.mocked(api.getCampaignOnboarding).mockResolvedValue({ role: "dm", state: "open", steps: [step("b", false)], requiredDone: 0, requiredTotal: 1 });

    const { container } = renderIt();

    fireEvent.click(await screen.findByRole("button", { name: "Сховати" }));

    await waitFor(() => expect(container.textContent).toBe(""));
  });

  it("помилка API — нічого не рендерить", async () => {
    vi.mocked(api.getCampaignOnboarding).mockRejectedValue(new Error("down"));

    const { container } = renderIt();

    await waitFor(() => expect(api.getCampaignOnboarding).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });
});
