/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { CreateGroupDialog } from "@/components/skills/dialogs/CreateGroupDialog";

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe("CreateGroupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("рендерить тригер відкриття діалогу", () => {
    render(<CreateGroupDialog campaignId="camp-1" />);
    expect(
      screen.getByRole("button", { name: /Створити групу заклинань/i }),
    ).toBeInTheDocument();
  });

  it("відкриває діалог і показує форму після кліку на тригер", () => {
    render(<CreateGroupDialog campaignId="camp-1" />);
    const trigger = screen.getByRole("button", {
      name: /Створити групу заклинань/i,
    });
    fireEvent.click(trigger);
    expect(
      screen.getByRole("heading", { name: /Створити нову групу заклинань/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Назва групи/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Створити групу/i }),
    ).toBeInTheDocument();
  });

  it("має поле вводу назви групи та кнопку Скасувати", () => {
    render(<CreateGroupDialog campaignId="camp-1" />);
    fireEvent.click(
      screen.getByRole("button", { name: /Створити групу заклинань/i }),
    );
    const input = screen.getByPlaceholderText("Назва групи");
    expect(input).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Скасувати/i }),
    ).toBeInTheDocument();
  });

  it("викликає onGroupCreated після успішного створення групи", async () => {
    const onGroupCreated = vi.fn();
    const fakeGroupId = "new-group-id";
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: fakeGroupId }),
    });

    render(
      <CreateGroupDialog campaignId="camp-1" onGroupCreated={onGroupCreated} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Створити групу заклинань/i }),
    );
    const input = screen.getByPlaceholderText("Назва групи");
    fireEvent.change(input, { target: { value: "Нова група" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Створити групу/i }),
    );

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/campaigns/camp-1/spells/groups",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Нова група" }),
        }),
      );
    });
    await vi.waitFor(() => {
      expect(onGroupCreated).toHaveBeenCalledWith(fakeGroupId);
    });
  });
});
