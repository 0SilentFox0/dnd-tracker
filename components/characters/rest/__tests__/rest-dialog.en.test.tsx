// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RestDialog } from "../RestDialog";

import "@/components/ui/__tests__/match-media";

vi.unmock("next-intl");

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { CharacterListItem } from "@/types/characters";

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useRest: () => ({ mutateOk: vi.fn(), isPending: false }) }));

describe("RestDialog (en)", () => {
  afterEach(cleanup);

  it("renders in English without raw keys", async () => {
    await renderWithIntl(
      <ConfirmProvider>
        <RestDialog campaignId="c" characters={[{ id: "a", name: "Lira" } as CharacterListItem]} open onOpenChange={() => {}} />
      </ConfirmProvider>,
      { locale: "en", namespaces: ["common", "validation", "rest"] },
    );

    expect(screen.getByRole("button", { name: "Start rest" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Long" })).toBeTruthy();
    expect(document.body.textContent).not.toContain("rest.");
  });
});
