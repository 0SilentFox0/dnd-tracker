// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NewCampaignForm } from "../NewCampaignForm";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { getTemplates } from "@/lib/api/templates";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/templates", async (original) => ({ ...(await original<object>()), getTemplates: vi.fn(async () => ({ official: [], mine: [] })) }));

afterEach(cleanup);

describe("NewCampaignForm i18n", () => {
  it.each([
    ["uk", "Створити кампанію", "Скасувати"],
    ["en", "Create campaign", "Cancel"],
  ] as const)("%s: renders real messages", async (locale, submit, cancel) => {
    await renderWithIntl(<QueryClientProvider client={new QueryClient()}><ConfirmProvider><NewCampaignForm /></ConfirmProvider></QueryClientProvider>, { locale, namespaces: ["common", "validation", "campaigns"] });

    expect(await screen.findByRole("button", { name: submit })).toBeTruthy();
    expect(screen.getByRole("link", { name: cancel })).toBeTruthy();
    expect(getTemplates).toHaveBeenCalled();
  });
});
