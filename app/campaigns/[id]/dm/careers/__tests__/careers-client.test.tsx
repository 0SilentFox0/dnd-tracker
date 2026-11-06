// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DMCareersPageClient } from "../careers-client";

import "@/components/ui/__tests__/match-media";
import { render } from "@/lib/i18n/test/render-uk";

vi.unmock("next-intl");

const mocks = vi.hoisted(() => ({ remove: vi.fn(), confirm: vi.fn(), notify: vi.fn() }));

const tier = (name: string) => ({ name, characteristics: [], skills: [], talents: [], trappings: [] });

vi.mock("@/lib/hooks/careers", () => ({
  useCareers: () => ({ isLoading: false, data: [{ id: "c1", name: "Воїн", icon: null, class: null, tiers: [tier("A"), tier("B"), tier("C"), tier("D")] }] }),
  useDeleteCareer: () => ({ mutateAsync: mocks.remove }),
}));
vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => mocks.confirm, useNotify: () => mocks.notify }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DMCareersPageClient", () => {
  it("lists careers with their tiers and offers create/edit/delete to the DM", () => {
    render(<DMCareersPageClient campaignId="c" />);

    expect(screen.getByText("Воїн")).toBeTruthy();
    expect(screen.getByText("A › B › C › D")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Нова кар'єра" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Видалити" })).toBeTruthy();
  });

  it("hides editing in the demo", () => {
    render(<DMCareersPageClient campaignId="c" canEdit={false} />);

    expect(screen.queryByRole("button", { name: "Нова кар'єра" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Видалити" })).toBeNull();
  });

  it("surfaces the in-use refusal from the server", async () => {
    mocks.confirm.mockResolvedValue(true);
    mocks.remove.mockRejectedValue(new Error("Кар'єру мають герої"));

    render(<DMCareersPageClient campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith("Кар'єру мають герої"));
  });
});
