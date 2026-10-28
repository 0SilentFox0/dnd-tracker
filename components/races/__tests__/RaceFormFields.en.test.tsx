// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RaceFormFields } from "@/components/races/RaceFormFields";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

describe("RaceFormFields (en)", () => {
  afterEach(cleanup);

  it("renders English text without raw keys", async () => {
    const { container } = await renderWithIntl(
      <ConfirmProvider><QueryClientProvider client={new QueryClient()}>
        <RaceFormFields campaignId="c1" form={{ data: { name: "Elf", icon: "", availableSkills: [], disabledSkills: [], abilities: [] }, set: vi.fn() }} compact />
      </QueryClientProvider></ConfirmProvider>,
      { locale: "en", namespaces: ["common", "validation", "races", "choices"] },
    );

    expect(screen.getByText("Race name *")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Stats/ })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/races\./);
    expect(screen.getByText("Spell slot progression")).toBeInTheDocument();
  });
});
