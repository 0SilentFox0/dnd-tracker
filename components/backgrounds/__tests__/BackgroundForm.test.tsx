// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { BackgroundForm } from "@/components/backgrounds/BackgroundForm";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { updateBackground } from "@/lib/api/backgrounds";
import { backgroundKeys } from "@/lib/hooks/backgrounds/keys";
import { characterKeys } from "@/lib/hooks/characters/keys";
import type { BackgroundData } from "@/types/backgrounds";
import type { Choice } from "@/types/choices";

const push = vi.fn();

const refresh = vi.fn();

const choices: Choice[] = [{ id: "skill", label: "Навичка", level: 1, count: 1, kind: "skill", skills: ["arcana", "history"] }];

vi.mock("@/lib/hooks/feats", () => ({ useFeats: () => ({ data: [{ id: "origin", name: "Origin", type: "origin" }, { id: "general", name: "General", type: "general" }] }) }));
vi.mock("@/lib/api/backgrounds", () => ({ updateBackground: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/components/choices/ChoiceListEditor", () => ({
  ChoiceListEditor: ({ onValidityChange, onChange }: { onValidityChange: (valid: boolean) => void; onChange: (value: Choice[]) => void }) => <>
    <button type="button" onClick={() => onValidityChange(false)}>Invalid choices</button>
    <button type="button" onClick={() => { onChange(choices); onValidityChange(true); }}>Valid choices</button>
  </>,
}));

const background: BackgroundData = { id: "b", name: "Sage", icon: null, description: null, choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: null, equipmentText: null };

const clients: QueryClient[] = [];

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  clients.push(client);
  render(<QueryClientProvider client={client}><ConfirmProvider><BackgroundForm campaignId="c" background={background} /></ConfirmProvider></QueryClientProvider>);

  return client;
}

function submit() {
  fireEvent.submit(document.getElementById("background-form") as HTMLFormElement);
}

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.resetAllMocks();
});

it("allows only origin feats and explains manual equipment", () => {
  mount();
  expect(screen.getByRole("option", { name: "Origin" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: "General" })).toBeNull();
  expect(screen.getByText(/Спорядження й гроші видає ДМ вручну/)).toBeTruthy();
});

it("blocks invalid choices, then saves one normalized domain body and navigates with refresh", async () => {
  vi.mocked(updateBackground).mockResolvedValue(background);

  const client = mount();

  client.setQueryData(backgroundKeys.list("c"), [background]);
  client.setQueryData(characterKeys.sheet("c"), {});
  fireEvent.click(screen.getByRole("button", { name: "Invalid choices" }));
  expect((screen.getByRole("button", { name: "Зберегти" }) as HTMLButtonElement).disabled).toBe(true);
  submit();
  expect(updateBackground).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Valid choices" }));
  fireEvent.change(screen.getByLabelText("Назва передісторії *"), { target: { value: "  Scholar  " } });
  fireEvent.change(screen.getByLabelText("Опис"), { target: { value: "  Lore  " } });
  fireEvent.change(screen.getByLabelText("Володіння інструментами (по одному в рядку)"), { target: { value: "  Flute  \n\n Dice " } });
  fireEvent.blur(screen.getByLabelText("Володіння інструментами (по одному в рядку)"));
  fireEvent.change(screen.getByLabelText("Риса походження"), { target: { value: "origin" } });
  fireEvent.change(screen.getByLabelText("Стартове спорядження та гроші"), { target: { value: "  Coins  " } });
  submit();
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(updateBackground).toHaveBeenCalledExactlyOnceWith("c", "b", {
    name: "Scholar", icon: null, description: "  Lore  ", choices, skillProficiencies: [], toolProficiencies: ["Flute", "Dice"], originFeatId: "origin", equipmentText: "  Coins  ",
  });
  expect(push).toHaveBeenCalledExactlyOnceWith("/campaigns/c/dm/backgrounds");
  expect(push.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]);
  expect(client.getQueryState(backgroundKeys.list("c"))?.isInvalidated).toBe(true);
  expect(client.getQueryState(characterKeys.sheet("c"))?.isInvalidated).toBe(true);
});

it("does not navigate on failure and enables another save", async () => {
  vi.mocked(updateBackground).mockRejectedValue(new Error("Mocked update failure"));
  mount();
  submit();
  await screen.findByText("Не вдалося зберегти передісторію");
  expect(updateBackground).toHaveBeenCalledTimes(1);
  expect(push).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "common.notify.gotIt" }));
  await waitFor(() => expect((screen.getByRole("button", { name: "Зберегти" }) as HTMLButtonElement).disabled).toBe(false));
});

it("cancel returns to the list without mutation or refresh", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Скасувати" }));
  expect(updateBackground).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledExactlyOnceWith("/campaigns/c/dm/backgrounds");
  expect(refresh).not.toHaveBeenCalled();
});

it("disables saving until the pending update settles", async () => {
  let resolveUpdate!: (value: BackgroundData) => void;

  vi.mocked(updateBackground).mockImplementation(() => new Promise(resolve => { resolveUpdate = resolve; }));
  mount();
  submit();
  await waitFor(() => expect((screen.getByRole("button", { name: "Збереження..." }) as HTMLButtonElement).disabled).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "Збереження..." }));
  expect(updateBackground).toHaveBeenCalledTimes(1);
  expect(push).not.toHaveBeenCalled();
  await act(async () => resolveUpdate(background));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
});
