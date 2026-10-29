// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AbilityCopySourcePicker } from "@/components/abilities/AbilityCopySourcePicker";
import { getAbilitySources, getOwnerAbilities } from "@/lib/api/abilities";

vi.mock("@/lib/api/abilities", () => ({
  getAbilitySources: vi.fn(async () => ({ sources: [{ kind: "skill", id: "s9", name: "Лють" }] })),
  getOwnerAbilities: vi.fn(async () => {
    throw new Error("network");
  }),
}));

describe("AbilityCopySourcePicker", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAbilitySources).mockResolvedValue({ sources: [{ kind: "skill", id: "s9", name: "Лють" }] });
    vi.mocked(getOwnerAbilities).mockRejectedValue(new Error("network"));
  });

  it("помилка завантаження вмінь показується, кнопки знову активні", async () => {
    const onPick = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AbilityCopySourcePicker campaignId="c1" onPick={onPick} />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Лють" }));

    expect(await screen.findByText('abilities.copy.loadFailed {"name":"Лють"}')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Лють" })).not.toBeDisabled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it.each(["class", "feat"] as const)("shows and copies %s sources returned by the API", async kind => {
    vi.mocked(getAbilitySources).mockResolvedValue({ sources: [{ kind, id: "source", name: "Нове джерело" }] });

    const abilities = [{ id: "note", name: "Нотатка", trigger: { event: "passive" as const }, effects: [{ kind: "note" as const, text: "Own ability" }] }];

    vi.mocked(getOwnerAbilities).mockResolvedValue({ abilities });

    const onPick = vi.fn();

    render(<QueryClientProvider client={new QueryClient()}><AbilityCopySourcePicker campaignId="c1" onPick={onPick} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Нове джерело" }));
    await waitFor(() => expect(onPick.mock.calls[0]?.[0]).toEqual(abilities));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(getOwnerAbilities).toHaveBeenCalledExactlyOnceWith("c1", kind, "source");
  });
});
