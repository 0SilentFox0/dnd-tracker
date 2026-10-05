// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityCopySourcePicker } from "@/components/abilities/AbilityCopySourcePicker";

vi.mock("@/lib/api/abilities", () => ({
  getAbilitySources: vi.fn(async () => ({ sources: [{ kind: "skill", id: "s9", name: "Лють" }] })),
  getOwnerAbilities: vi.fn(async () => {
    throw new Error("network");
  }),
}));

describe("AbilityCopySourcePicker", () => {
  afterEach(cleanup);

  it("помилка завантаження вмінь показується, кнопки знову активні", async () => {
    const onPick = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AbilityCopySourcePicker campaignId="c1" onPick={onPick} />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Лють" }));

    expect(await screen.findByText("Не вдалося завантажити вміння «Лють». Спробуйте ще раз.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Лють" })).not.toBeDisabled();
    expect(onPick).not.toHaveBeenCalled();
  });
});
