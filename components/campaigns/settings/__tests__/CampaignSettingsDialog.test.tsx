// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignSettingsDialog } from "@/components/campaigns/settings/CampaignSettingsDialog";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { deleteCampaign } from "@/lib/api/campaigns";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/campaigns", () => ({ deleteCampaign: vi.fn(async () => ({ success: true })), updateCampaign: vi.fn() }));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

const campaign = { name: "Зоря", description: null, maxLevel: 20, xpMultiplier: 2.5, allowPlayerEdit: true, status: "active" };

const renderDialog = () =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient()}>
      <CampaignSettingsDialog campaignId="c1" campaign={campaign} open onOpenChange={vi.fn()} />
    </QueryClientProvider>,
  );

describe("CampaignSettingsDialog: видалення", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("показує небезпечну зону; після підтвердження видаляє кампанію", async () => {
    renderDialog();
    expect(screen.getByText("Небезпечна зона")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Видалити кампанію" }));
    expect(await screen.findByText("Видалити кампанію «Зоря»?")).toBeInTheDocument();
    expect(deleteCampaign).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));
    await waitFor(() => expect(deleteCampaign).toHaveBeenCalledWith("c1"));
  });

  it("скасування підтвердження не видаляє", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Видалити кампанію" }));
    await screen.findByText("Видалити кампанію «Зоря»?");
    fireEvent.click(screen.getAllByRole("button", { name: "Скасувати" })[1]);
    await waitFor(() => expect(screen.queryByText("Видалити кампанію «Зоря»?")).not.toBeInTheDocument());
    expect(deleteCampaign).not.toHaveBeenCalled();
  });
});
