// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { battleQueryKey } from "@/lib/hooks/battles";

const battle = { id: "b1", name: "Засідка", description: "Ніч", status: "prepared", participants: [{ id: "ch1", type: "character", side: "ally" }] };

const api = vi.hoisted(() => ({ createBattle: vi.fn(), updateBattle: vi.fn(), deleteBattle: vi.fn() }));

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/api/battles", async (orig) => {
  const actual = await orig<Record<string, unknown>>();

  return {
    ...Object.fromEntries(Object.keys(actual).map((k) => [k, vi.fn()])),
    ...api,
    getBattle: vi.fn(async () => battle),
    getBattleBalance: vi.fn(async () => ({})),
  };
});
vi.mock("@/lib/api/characters", () => ({ getCharacters: vi.fn(async () => [{ id: "ch1", name: "Арвен", type: "player", controlledBy: "u1", avatar: null }]) }));
vi.mock("@/lib/api/units", () => ({ getUnits: vi.fn(async () => []) }));
vi.mock("@/lib/api/races", () => ({ getRaces: vi.fn(async () => []) }));

import { BattleSetupForm } from "@/components/battle/setup/BattleSetupForm";

let client: QueryClient;

const renderForm = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={client}>
      <ConfirmProvider>{ui}</ConfirmProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("BattleSetupForm", () => {
  it("create mode: empty form, autopick card, create button", async () => {
    renderForm(<BattleSetupForm campaignId="c1" />);

    expect(((await screen.findByLabelText("Назва битви *")) as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("heading", { name: "Створити сцену бою" })).toBeTruthy();
    expect(screen.getByText("Підбір ворогів")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Видалити" })).toBeNull();
    expect(screen.getByRole("button", { name: "Створити сцену бою" })).toBeTruthy();
  });

  it("create mode: submitting without participants does not call the API", async () => {
    renderForm(<BattleSetupForm campaignId="c1" />);

    await screen.findByText("Підбір ворогів");
    fireEvent.change(screen.getByLabelText("Назва битви *"), { target: { value: "Нова" } });
    fireEvent.submit(document.getElementById("battle-form") as HTMLFormElement);

    expect(api.createBattle).not.toHaveBeenCalled();
  });

  it("edit mode: seeds from the battle once and keeps edits when it refetches", async () => {
    renderForm(<BattleSetupForm campaignId="c1" battleId="b1" />);

    const name = (await screen.findByLabelText("Назва битви *")) as HTMLInputElement;

    expect(name.value).toBe("Засідка");
    expect((screen.getByLabelText("Опис") as HTMLTextAreaElement).value).toBe("Ніч");
    expect(screen.getByRole("tab", { name: /Склад · 1/ })).toBeTruthy();
    expect(screen.queryByText("Підбір ворогів")).toBeNull();

    fireEvent.change(name, { target: { value: "Нова" } });
    client.setQueryData(battleQueryKey("c1", "b1"), { ...battle, name: "Серверна", updatedAt: "2026-10-05T12:00:00Z" });
    await waitFor(() => expect(client.getQueryData<{ updatedAt?: string }>(battleQueryKey("c1", "b1"))?.updatedAt).toBeDefined());

    expect((screen.getByLabelText("Назва битви *") as HTMLInputElement).value).toBe("Нова");
  });

  it("edit mode: does not poll the prepared battle and shows the delete button", async () => {
    renderForm(<BattleSetupForm campaignId="c1" battleId="b1" />);

    await screen.findByLabelText("Назва битви *");

    const query = client.getQueryCache().find({ queryKey: battleQueryKey("c1", "b1") });

    const interval = query?.observers[0]?.options.refetchInterval;

    expect(typeof interval === "function" ? interval(query as never) : interval).toBe(false);
    expect(screen.getByRole("button", { name: "Видалити" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зберегти зміни" })).toBeTruthy();
  });

  it("edit mode: saves the seeded participants", async () => {
    api.updateBattle.mockResolvedValue(battle);
    renderForm(<BattleSetupForm campaignId="c1" battleId="b1" />);

    await screen.findByLabelText("Назва битви *");
    fireEvent.submit(document.getElementById("battle-edit-form") as HTMLFormElement);

    await waitFor(() => expect(api.updateBattle).toHaveBeenCalled());
    expect(api.updateBattle.mock.calls[0]?.[2]).toEqual({ name: "Засідка", description: "Ніч", participants: battle.participants });
  });
});
