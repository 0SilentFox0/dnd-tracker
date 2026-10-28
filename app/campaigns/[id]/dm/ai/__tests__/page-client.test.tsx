// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DmAiPageClient } from "../page-client";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

vi.mock("@/lib/hooks/ai", () => ({
  useAiSettings: () => ({ data: undefined, isLoading: false }),
  useApiTokens: () => ({ query: { isPending: false, isError: false, data: [] }, create: vi.fn(), revoke: vi.fn() }),
}));

describe("DmAiPageClient REST API panel", () => {
  it("шаблон: є посилання на openapi.json і приклад curl з campaignId", () => {
    renderWithConfirm(<DmAiPageClient campaignId="c1" isTemplate />);

    expect(screen.getByRole("link", { name: /openapi\.json/ })).toHaveAttribute("href", "/api/openapi.json");

    const curl = screen.getByText(/^curl/).textContent;

    expect(curl).toContain("/api/campaigns/c1/units");
    expect(curl).toContain("Authorization: Bearer");
  });
});
