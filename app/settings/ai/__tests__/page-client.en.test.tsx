// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiSettingsClient } from "../page-client";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/ai", () => ({
  useAiCredentials: () => ({ query: { isPending: false, isError: false, data: [] }, isPending: false, save: vi.fn(), patch: vi.fn(), remove: vi.fn() }),
}));

const render = (configured: boolean) => renderWithIntl(<ConfirmProvider><AiSettingsClient configured={configured} /></ConfirmProvider>, { locale: "en", namespaces: ["common", "validation", "ai"] });

describe("AiSettingsClient en", () => {
  it("renders provider cards in English without raw keys", async () => {
    await render(true);

    expect(screen.getByText("AI keys")).toBeInTheDocument();
    expect(screen.getAllByText("Default model")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Verify and save" })).toHaveLength(3);
  });

  it("shows the not-configured error in English", async () => {
    await render(false);

    expect(screen.getByText("The AI assistant is not configured on the server")).toBeInTheDocument();
  });
});
