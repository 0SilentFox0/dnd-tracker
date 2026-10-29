/**
 * @vitest-environment happy-dom
 */
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render as rtlRender, screen } from "@testing-library/react";
import { afterEach, beforeEach,describe, expect, it, vi } from "vitest";

import { CreateSpellGroupDialog } from "@/components/spells/dialogs/CreateSpellGroupDialog";

const mockRefresh = vi.fn();

let queryClient: QueryClient;

function render(ui: ReactElement) {
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const fakeGroupId = "new-group-id";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/api/spells", () => ({
  createSpellGroup: vi.fn().mockResolvedValue({ id: "new-group-id" }),
}));

describe("CreateSpellGroupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
  });

  afterEach(cleanup);

  it("рендерить тригер відкриття діалогу", () => {
    render(<CreateSpellGroupDialog campaignId="camp-1" />);
    expect(
      screen.getByRole("button", { name: "spells.createGroup.trigger" }),
    ).toBeInTheDocument();
  });

  it("відкриває діалог і показує форму після кліку на тригер", () => {
    render(<CreateSpellGroupDialog campaignId="camp-1" />);

    const trigger = screen.getByRole("button", {
      name: "spells.createGroup.trigger",
    });

    fireEvent.click(trigger);
    expect(
      screen.getByRole("heading", { name: "spells.createGroup.title" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("spells.createGroup.name")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "spells.createGroup.submit" }),
    ).toBeInTheDocument();
  });

  it("має поле вводу назви групи та кнопку скасування", () => {
    render(<CreateSpellGroupDialog campaignId="camp-1" />);
    fireEvent.click(
      screen.getByRole("button", { name: "spells.createGroup.trigger" }),
    );

    const input = screen.getByPlaceholderText("spells.createGroup.placeholder");

    expect(input).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "common.actions.cancel" }),
    ).toBeInTheDocument();
  });

  it("викликає onGroupCreated після успішного створення групи", async () => {
    const onGroupCreated = vi.fn();

    render(
      <CreateSpellGroupDialog campaignId="camp-1" onGroupCreated={onGroupCreated} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "spells.createGroup.trigger" }),
    );

    const input = screen.getByPlaceholderText("spells.createGroup.placeholder");

    fireEvent.change(input, { target: { value: "Нова група" } });
    fireEvent.click(
      screen.getByRole("button", { name: "spells.createGroup.submit" }),
    );

    await vi.waitFor(() => {
      expect(onGroupCreated).toHaveBeenCalledWith(fakeGroupId);
    });
  });

  it("інвалідовує список груп заклинань, щоб нова група одразу з'явилась у меню", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    render(<CreateSpellGroupDialog campaignId="camp-1" />);
    fireEvent.click(screen.getByRole("button", { name: "spells.createGroup.trigger" }));
    fireEvent.change(screen.getByPlaceholderText("spells.createGroup.placeholder"), {
      target: { value: "Нова група" },
    });
    fireEvent.click(screen.getByRole("button", { name: "spells.createGroup.submit" }));

    await vi.waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["spell-groups", "camp-1"] });
    });
  });
});
