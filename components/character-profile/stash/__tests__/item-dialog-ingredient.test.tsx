// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemDialog } from "../ItemDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

const mutateAsync = vi.fn();

vi.unmock("next-intl");
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("@/lib/hooks/characters", () => ({ useStashAction: () => ({ mutateAsync, isPending: false }) }));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));

afterEach(() => {
  cleanup();
  mutateAsync.mockReset();
});

const render = (item: Parameters<typeof ItemDialog>[0]["item"]) => {
  mockMatchMedia(false);

  return renderWithIntl(<ItemDialog item={item} open onOpenChange={vi.fn()} />, { locale: "en", namespaces: ["common", "validation", "inventory"] });
};

describe("ItemDialog ingredient fields", () => {
  it("sends worthGp and a slug ingredient", async () => {
    await render(null);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Gem" } });
    fireEvent.change(screen.getByLabelText("Worth, gp"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Ingredient for… (optional)"), { target: { value: "Diamond Dust" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ action: "addItem", name: "Gem", worthGp: 50, ingredient: "diamond-dust" })));
  });

  it("omits both fields for a plain legacy item", async () => {
    await render({ id: "i", name: "Key", quantity: 1, consumable: false });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ action: "editItem", itemId: "i", name: "Key", description: undefined, quantity: 1, consumable: false, worthGp: undefined, ingredient: undefined }));
  });
});
