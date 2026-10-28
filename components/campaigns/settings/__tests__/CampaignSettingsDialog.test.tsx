// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignSettingsDialog } from "@/components/campaigns/settings/CampaignSettingsDialog";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { deleteCampaign, updateCampaign } from "@/lib/api/campaigns";
import type { CampaignSettings, CampaignSettingsMeta } from "@/types/campaigns";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/campaigns", () => ({ deleteCampaign: vi.fn(async () => ({ success: true })), updateCampaign: vi.fn(async () => ({})) }));

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

const campaign: CampaignSettings = { name: "Зоря", description: null, maxLevel: 20, allowPlayerEdit: true, critChoiceByDm: false, status: "active" };

const baseMeta: CampaignSettingsMeta = { createdFromId: null, isTemplate: false };

vi.mock("@/components/campaigns/templates/SourceSyncDialog", () => ({
  SourceSyncDialog: ({ open }: { open: boolean }) => (open ? <div>sync-dialog-open</div> : null),
}));

const renderDialog = (meta: Partial<CampaignSettingsMeta> = {}) =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient()}>
      <CampaignSettingsDialog campaignId="c1" campaign={campaign} meta={{ ...baseMeta, ...meta }} open onOpenChange={vi.fn()} />
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
    fireEvent.click(screen.getAllByRole("button", { name: "common.confirm.cancel" }).pop() as HTMLElement);
    await waitFor(() => expect(screen.queryByText("Видалити кампанію «Зоря»?")).not.toBeInTheDocument());
    expect(deleteCampaign).not.toHaveBeenCalled();
  });
});

describe("CampaignSettingsDialog: оновлення з шаблону", () => {
  afterEach(cleanup);

  it("без createdFromId кнопки немає", () => {
    renderDialog();
    expect(screen.queryByRole("button", { name: "Оновлення з шаблону" })).toBeNull();
  });

  it("з createdFromId кнопка відкриває діалог синхронізації", () => {
    renderDialog({ createdFromId: "t1" });
    expect(screen.queryByText("sync-dialog-open")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Оновлення з шаблону" }));
    expect(screen.getByText("sync-dialog-open")).toBeTruthy();
  });

  it("збереження не шле createdFromId та isTemplate", async () => {
    renderDialog({ createdFromId: "t1", isTemplate: true });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));
    await waitFor(() => expect(updateCampaign).toHaveBeenCalled());

    const body = vi.mocked(updateCampaign).mock.calls[0][1] as Record<string, unknown>;

    expect(body).not.toHaveProperty("createdFromId");
    expect(body).not.toHaveProperty("isTemplate");
  });
});

describe("CampaignSettingsDialog: джерела й ліцензії", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("показує credits лише для читання, коли вони є", () => {
    renderDialog({ credits: "SRD 5.2 by Wizards of the Coast LLC" });
    expect(screen.getByText("Джерела й ліцензії")).toBeInTheDocument();
    expect(screen.getByText("SRD 5.2 by Wizards of the Coast LLC")).toBeInTheDocument();
  });

  it("без credits розділу немає", () => {
    renderDialog();
    expect(screen.queryByText("Джерела й ліцензії")).toBeNull();
  });
});

describe("CampaignSettingsDialog: ефекти крита", () => {
  afterEach(cleanup);

  it("показує чекбокс вибору ефектів ДМом", () => {
    renderDialog();
    expect(screen.getByLabelText("ДМ обирає ефекти крита/провалу")).not.toBeChecked();
    expect(screen.getByText("Вимкнено — ефект випадковий")).toBeInTheDocument();
  });
});
