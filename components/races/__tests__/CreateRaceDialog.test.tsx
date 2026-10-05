// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateRaceDialog } from "@/components/races/CreateRaceDialog";
import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

vi.mock("@/lib/hooks/skills", () => ({ useMainSkills: () => ({ data: [] }) }));

describe("CreateRaceDialog", () => {
  afterEach(cleanup);

  it.each([false, true])("кнопка у футері сабмітить форму (mobile=%s)", (mobile) => {
    mockMatchMedia(mobile);

    const onCreateRace = vi.fn();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CreateRaceDialog open onOpenChange={vi.fn()} campaignId="c1" onCreateRace={onCreateRace} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/Назва раси/), { target: { value: "Гном" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити расу" }));

    expect(onCreateRace).toHaveBeenCalledWith(expect.objectContaining({ name: "Гном" }));

    if (mobile) expect(document.querySelector("[data-slot=sheet-footer]")).not.toBeNull();
  });
});
