// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NewCampaignForm } from "../NewCampaignForm";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { createCampaign } from "@/lib/api/campaigns";
import { getTemplates } from "@/lib/api/templates";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/templates", async (original) => ({ ...(await original<object>()), getTemplates: vi.fn() }));
vi.mock("@/lib/api/campaigns", async (original) => ({ ...(await original<object>()), createCampaign: vi.fn(async () => ({ id: "new" })) }));

const card = (id: string, name: string) => ({ id, name, description: null, visibility: "official", counts: {} });

afterEach(cleanup);

describe("NewCampaignForm default template", () => {
  it("creates without a template by default and never sends an empty id", async () => {
    vi.mocked(getTemplates).mockResolvedValue({ official: [card("srd", "5e SRD 5.2")], mine: [] } as never);
    render(<QueryClientProvider client={new QueryClient()}><ConfirmProvider><NewCampaignForm /></ConfirmProvider></QueryClientProvider>);
    await waitFor(() => expect((screen.getByRole("button", { name: "campaigns.form.submit" }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByRole("combobox", { name: "campaigns.templatePicker.ariaLabel" }).textContent).toContain("campaigns.templatePicker.none");
    fireEvent.change(screen.getByLabelText(/campaigns.form.name/), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: "campaigns.form.submit" }));
    await waitFor(() => expect(createCampaign).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createCampaign).mock.calls[0][0].templateId).toBeUndefined();
  });
});
