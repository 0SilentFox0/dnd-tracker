// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NewCampaignForm } from "../NewCampaignForm";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { createCampaign } from "@/lib/api/campaigns";
import { getTemplates } from "@/lib/api/templates";

vi.mock("@/components/ui/select-field", () => ({
  SelectField: ({ value, onValueChange, groups, "aria-label": label }: { value: string; onValueChange: (v: string) => void; groups: { options: { value: string; label: string }[] }[]; "aria-label": string }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {groups.flatMap((g) => g.options).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/templates", async (original) => ({ ...(await original<object>()), getTemplates: vi.fn() }));
vi.mock("@/lib/api/campaigns", async (original) => ({ ...(await original<object>()), createCampaign: vi.fn(async () => ({ id: "new" })) }));

const card = (id: string, name: string) => ({ id, name, description: null, visibility: "official", counts: {} });

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("NewCampaignForm default template", () => {
  it("creates without a template by default and never sends an empty id", async () => {
    vi.mocked(getTemplates).mockResolvedValue({ official: [card("srd", "5e SRD 5.2")], mine: [] } as never);
    render(<QueryClientProvider client={new QueryClient()}><ConfirmProvider><NewCampaignForm /></ConfirmProvider></QueryClientProvider>);
    await waitFor(() => expect((screen.getByRole("button", { name: "campaigns.form.submit" }) as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByRole("combobox", { name: "campaigns.templatePicker.ariaLabel" }) as HTMLSelectElement).value).toBe("__none");
    fireEvent.change(screen.getByLabelText(/campaigns.form.name/), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: "campaigns.form.submit" }));
    await waitFor(() => expect(createCampaign).toHaveBeenCalledTimes(1));
    expect(vi.mocked(createCampaign).mock.calls[0][0].templateId).toBeUndefined();
  });

  it.each([undefined, "en"] as const)("sends the selected SRD content language (%s), including the default", async (pickedLocale) => {
    vi.mocked(getTemplates).mockResolvedValue({ official: [{ ...card("canonical", "5e SRD 5.2"), kind: "template", templateKey: "srd-5.2", locale: "en", availableLocales: ["en", "uk"] }], mine: [] });
    render(<QueryClientProvider client={new QueryClient()}><ConfirmProvider><NewCampaignForm /></ConfirmProvider></QueryClientProvider>);
    await waitFor(() => expect((screen.getByRole("button", { name: "campaigns.form.submit" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText("campaigns.templatePicker.ariaLabel"), { target: { value: "canonical" } });

    if (pickedLocale) fireEvent.change(screen.getByLabelText("campaigns.templatePicker.languageLabel"), { target: { value: pickedLocale } });

    fireEvent.change(screen.getByLabelText(/campaigns.form.name/), { target: { value: "Localized" } });
    fireEvent.click(screen.getByRole("button", { name: "campaigns.form.submit" }));
    await waitFor(() => expect(vi.mocked(createCampaign).mock.lastCall?.[0]).toMatchObject({ templateId: "canonical", contentLocale: pickedLocale ?? "uk" }));
  });
});
