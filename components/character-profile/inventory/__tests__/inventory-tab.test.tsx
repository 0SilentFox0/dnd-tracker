// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";

import { InventoryTab } from "@/components/character-profile/inventory/InventoryTab";
import { ProfileContext } from "@/components/character-profile/ProfileContext";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn(), useStash: vi.fn() }));

const view = {
  purse: { gp: 5, sp: 0, cp: 3 },
  items: [{ id: "p1", name: "Зілля лікування", quantity: 2, consumable: true }],
  artifacts: [{ id: "r1", name: "Перстень сили", icon: null, rarity: "epic", slot: "ring", description: "Дає силу." }],
};

vi.mock("@/lib/hooks/notifications", () => ({ useSeenOnOpen: () => new Set<string>(), useNotifications: () => ({ data: undefined }) }));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: false } } }) }));

vi.mock("@/lib/hooks/characters/useStash", async (orig) => ({
  ...(await orig<object>()),
  useStash: mocks.useStash,
  useStashAction: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
  useInventoryLog: () => ({ data: { pages: [] }, isPending: false }),
  useFreeArtifacts: () => ({ data: [] }),
}));

const renderTab = (over: Partial<CharacterSheet> = {}) =>
  renderWithConfirm(
    <ProfileContext.Provider value={{ campaignId: "camp", characterId: "lira", sheet: { ...sheetFixture, ...over }, canEdit: true }}>
      <InventoryTab />
    </ProfileContext.Provider>,
  );

const viewer = (isDM: boolean, isOwner: boolean) => ({ viewer: { isDM, isOwner } });

describe("InventoryTab", () => {
  beforeEach(() => {
    mocks.mutateAsync.mockResolvedValue({});
    mocks.useStash.mockReturnValue({ data: view, isPending: false, isError: false, error: null, refetch: vi.fn() });
    mockMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("десктоп: деталі в панелі, «Вдягнути» викликає equip", async () => {
    renderTab();

    fireEvent.click(screen.getByLabelText("Перстень сили"));

    expect(await screen.findByText(/Кільце|Перстень/, { selector: "p" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Вдягнути" }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "equip", artifactId: "r1" }));
  });

  it("телефон: клік по предмету відкриває діалог, «Використати» викликає useItem", async () => {
    mockMatchMedia(true);
    renderTab();

    fireEvent.click(screen.getByLabelText("Зілля лікування"));

    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("Зілля лікування")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Використати" }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "useItem", itemId: "p1" }));
  });

  it("drag з рюкзака у сумісний слот екіпірує, у несумісний — ні", async () => {
    renderTab();

    fireEvent.dragStart(screen.getByLabelText("Перстень сили"));
    fireEvent.drop(screen.getByLabelText("Перстень, порожньо"));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "equip", artifactId: "r1" }));

    mocks.mutateAsync.mockClear();

    fireEvent.dragStart(screen.getByLabelText("Перстень сили"));
    fireEvent.drop(screen.getByLabelText("Шолом, порожньо"));

    await Promise.resolve();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("drag зі слота «Броня» у рюкзак знімає", async () => {
    renderTab();

    fireEvent.dragStart(screen.getByLabelText("Броня: Кольчуга ельфів"));
    fireEvent.drop(screen.getByLabelText("Зілля лікування"));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "stash", slot: "armor" }));
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("порожній слот приймає drop: не disabled, без pointer-events-none", async () => {
    renderTab();

    const slot = screen.getByLabelText("Перстень, порожньо");

    expect((slot as HTMLButtonElement).disabled).toBe(false);
    expect(slot.className).not.toContain("pointer-events-none");
    expect(slot.getAttribute("aria-disabled")).toBe("true");
    expect(slot.getAttribute("tabindex")).toBe("-1");

    fireEvent.dragStart(screen.getByLabelText("Перстень сили"));
    fireEvent.drop(slot);

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledWith({ action: "equip", artifactId: "r1" }));
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("перегляд без прав: деталі без дій, без «Додати» і «Витратити»", async () => {
    renderTab(viewer(false, false));

    fireEvent.click(screen.getByLabelText("Перстень сили"));

    expect(await screen.findByText("Дає силу.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Вдягнути" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Передати" })).toBeNull();
    expect(screen.queryByLabelText("Додати")).toBeNull();
    expect(screen.queryByLabelText("Витратити")).toBeNull();
  });

  it("на схваленні: 9 слотів і повідомлення, useStash вимкнено", () => {
    mocks.useStash.mockReturnValue({ data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() });
    renderTab({ review: { pending: true, note: null } });

    expect(screen.getByLabelText("Шолом, порожньо")).toBeTruthy();
    expect(screen.getByText("Підсумок з'явиться після схвалення персонажа")).toBeTruthy();
    expect(mocks.useStash).toHaveBeenCalledWith("camp", "lira", { enabled: false });
  });

  it("DM: «+» відкриває меню з двома варіантами", async () => {
    renderTab(viewer(true, false));

    fireEvent.click(screen.getByLabelText("Додати"));

    expect(await screen.findByRole("button", { name: "Видати артефакт" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Додати предмет" })).toBeTruthy();
  });

  it("гравець: «+» одразу відкриває діалог предмета", async () => {
    renderTab();

    fireEvent.click(screen.getByLabelText("Додати"));

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Видати артефакт" })).toBeNull();
  });

  it("«Витратити» відкриває діалог грошей", async () => {
    renderTab();

    fireEvent.click(screen.getByLabelText("Витратити"));

    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("Витратити")).toBeTruthy();
  });
});
