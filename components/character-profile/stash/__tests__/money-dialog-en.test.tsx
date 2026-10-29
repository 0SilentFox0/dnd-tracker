// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MoneyDialog } from "../MoneyDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("@/lib/hooks/characters/useStash", () => ({ useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));

afterEach(cleanup);

describe("MoneyDialog in English", () => {
  it("renders the spend form with English labels", async () => {
    mockMatchMedia(false);
    await renderWithIntl(<MoneyDialog mode="spend" purse={{ gp: 1, sp: 0, cp: 0 }} open onOpenChange={vi.fn()} />, { locale: "en", namespaces: ["common", "validation", "inventory"] });

    expect(screen.getByText("Spend")).toBeTruthy();
    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByRole("option", { name: "gp" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeTruthy();
  });
});
