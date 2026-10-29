// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SourceSyncDialog } from "@/components/campaigns/templates/SourceSyncDialog";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { SourceDiffItem } from "@/types/campaigns";

const mocks = vi.hoisted(() => ({ items: [] as unknown[], apply: vi.fn(), isFetching: false }));

vi.mock("@/lib/hooks/campaigns", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/hooks/campaigns")>()),
  useSourceDiff: () => ({ data: { source: { id: "s", name: "HoMM", kind: "template" }, syncedAt: null, items: mocks.items }, isLoading: false, isError: false, isFetching: mocks.isFetching, refetch: vi.fn() }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/api/source-sync", () => ({ applySourceChanges: (...args: unknown[]) => mocks.apply(...args), getSourceDiff: vi.fn() }));

const k = (key: string, params?: object) => `campaigns.${key}${params ? ` ${JSON.stringify(params)}` : ""}`;

const item = (over: Partial<SourceDiffItem>): SourceDiffItem => ({ scope: "spells", key: "k", localId: null, name: "X", status: "new", changedFields: [], sourceHash: "h", requires: [], ...over });

const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

const ui = (onOpenChange = vi.fn()) => (
  <QueryClientProvider client={queryClient}>
    <SourceSyncDialog campaignId="c1" isTemplate={false} open onOpenChange={onOpenChange} />
  </QueryClientProvider>
);

const render = (onOpenChange = vi.fn()) => renderWithConfirm(ui(onOpenChange));

describe("SourceSyncDialog", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mocks.apply.mockReset().mockResolvedValue({ applied: 1, ignored: 1, autoAdded: [], warnings: [] });
    mocks.isFetching = false;
    mocks.items = [
      item({ key: "fireball", name: "Fireball" }),
      item({ key: "bless", name: "Bless", status: "conflict" }),
      item({ scope: "artifacts", key: "old", name: "Old", status: "deletedInSource", usage: { characters: 2, content: 1 } }),
    ];
  });
  afterEach(cleanup);

  it("групує, за замовчуванням вибирає нове, показує деталі", () => {
    render();

    expect(screen.getByText(k("sourceSync.groupTitle", { label: k("sourceSync.scope.spells"), count: 2 }))).toBeTruthy();
    expect(screen.getByText(k("sourceSync.groupTitle", { label: k("sourceSync.scope.artifacts"), count: 1 }))).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Fireball" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("checkbox", { name: "Bless" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("checkbox", { name: "Old" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(k("sourceSync.details.conflict"))).toBeTruthy();
    expect(screen.getByText(k("sourceSync.details.usage", { usage: `${k("sourceSync.usage.characters", { count: 2 })}, ${k("sourceSync.usage.records", { count: 1 })}` }))).toBeTruthy();
    expect(screen.getByRole("button", { name: k("sourceSync.apply", { count: 1 }) })).toBeTruthy();
  });

  it("застосування шле вибрані refs", async () => {
    render();
    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.apply", { count: 1 }) }));

    await vi.waitFor(() => expect(mocks.apply).toHaveBeenCalledWith("c1", { apply: [{ scope: "spells", key: "fireball", sourceHash: "h", status: "new" }], ignore: [] }));
  });

  it("видалення з джерела потребує підтвердження", async () => {
    render();
    fireEvent.click(screen.getByRole("checkbox", { name: "Old" }));
    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.apply", { count: 2 }) }));
    fireEvent.click(await screen.findByRole("button", { name: "common.actions.delete" }));
    await vi.waitFor(() => expect(mocks.apply).toHaveBeenCalled());

    expect(mocks.apply.mock.calls[0][1].apply.map((r: { key: string }) => r.key)).toEqual(["fireball", "old"]);
  });

  it("ігнорувати вибране питає підтвердження", async () => {
    render();
    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.ignore") }));
    expect(await screen.findByText(k("sourceSync.confirmIgnore.title", { count: 1 }))).toBeTruthy();
    expect(mocks.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.confirmIgnore.confirm") }));

    await vi.waitFor(() => expect(mocks.apply).toHaveBeenCalledWith("c1", { apply: [], ignore: [{ scope: "spells", key: "fireball", sourceHash: "h", status: "new" }] }));
  });

  it("скасування підтвердження ігнорування не шле запит", async () => {
    render();
    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.ignore") }));
    await screen.findByText(k("sourceSync.confirmIgnore.title", { count: 1 }));
    fireEvent.click(screen.getAllByRole("button", { name: "common.actions.cancel" }).pop() as HTMLElement);
    await vi.waitFor(() => expect(screen.queryByText(k("sourceSync.confirmIgnore.title", { count: 1 }))).toBeNull());

    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("підтвердження видалення згадує використання", async () => {
    render();
    fireEvent.click(screen.getByRole("checkbox", { name: "Old" }));
    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.apply", { count: 2 }) }));

    expect(await screen.findByText(k("sourceSync.confirmDelete.usage", { usage: `${k("sourceSync.usage.characters", { count: 2 })}, ${k("sourceSync.usage.records", { count: 1 })}` }))).toBeTruthy();
  });

  it("«Вибрати все / Зняти все» перемикає групу", () => {
    render();
    fireEvent.click(screen.getAllByRole("button", { name: k("sourceSync.selectAll") })[0]);
    expect(screen.getByRole("checkbox", { name: "Bless" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getAllByRole("button", { name: k("sourceSync.deselectAll") })[0]);
    expect(screen.getByRole("checkbox", { name: "Fireball" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("button", { name: k("sourceSync.apply", { count: 0 }) })).toBeTruthy();
  });

  it("під час оновлення діффу дії вимкнені", () => {
    mocks.isFetching = true;
    render();

    expect(screen.getByRole("button", { name: k("sourceSync.apply", { count: 1 }) }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: k("sourceSync.ignore") }).hasAttribute("disabled")).toBe(true);
  });

  it("409 лишає пояснення після нового діффу і не показує тривогу", async () => {
    mocks.apply.mockRejectedValue(new ApiError("Джерело змінилось", 409, "/x"));

    const { rerender } = render();

    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.apply", { count: 1 }) }));
    expect(await screen.findByText(k("sourceSync.stale"))).toBeTruthy();

    mocks.items = [...(mocks.items as SourceDiffItem[])];
    rerender(<ConfirmProvider>{ui()}</ConfirmProvider>);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(k("sourceSync.stale"))).toBeTruthy();
  });

  it("повідомлення про 409 ховається під час оновлення та після закриття", async () => {
    mocks.apply.mockRejectedValue(new ApiError("x", 409, "/x"));

    const { rerender } = render();

    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.apply", { count: 1 }) }));
    await vi.waitFor(() => expect(mocks.apply).toHaveBeenCalled());
    await screen.findByText(k("sourceSync.stale"));
    mocks.isFetching = true;
    rerender(<ConfirmProvider>{ui()}</ConfirmProvider>);
    expect(screen.queryByText(k("sourceSync.stale"))).toBeNull();

    mocks.isFetching = false;
    rerender(<ConfirmProvider>{ui()}</ConfirmProvider>);
    fireEvent.click(screen.getByRole("button", { name: "common.actions.cancel" }));
    expect(screen.queryByText(k("sourceSync.stale"))).toBeNull();
  });

  it("закриття очищає помилку", async () => {
    mocks.apply.mockRejectedValue(new Error("Збій"));

    const onOpenChange = vi.fn();

    render(onOpenChange);
    fireEvent.click(screen.getByRole("button", { name: k("sourceSync.apply", { count: 1 }) }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "common.actions.cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("порожній список", () => {
    mocks.items = [];
    render();

    expect(screen.getByText(k("sourceSync.empty.title"))).toBeTruthy();
    expect(screen.getAllByRole("button", { name: k("sourceSync.close") })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "common.ui.close" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(k("sourceSync.ignore")) })).toBeNull();
    expect(screen.queryByRole("button", { name: /sourceSync\.apply/ })).toBeNull();
  });

  it("показує автододане за requires", () => {
    mocks.items = [item({ scope: "units", key: "angel", name: "Angel", requires: [{ scope: "races", key: "inferno", name: "Inferno" }] })];
    render();

    expect(screen.getByText(k("sourceSync.alsoAdded", { names: "Inferno" }))).toBeTruthy();
  });
});
