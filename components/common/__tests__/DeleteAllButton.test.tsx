// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const nouns: [string, string, string] = ["юніт", "юніти", "юнітів"];

afterEach(cleanup);

describe("DeleteAllButton", () => {
  it("renders nothing when there is nothing to delete", () => {
    renderWithConfirm(<DeleteAllButton count={0} nouns={nouns} description="x" onConfirm={vi.fn()} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("asks for confirmation with a pluralized title and calls onConfirm", async () => {
    const onConfirm = vi.fn(async () => undefined);

    renderWithConfirm(<DeleteAllButton count={3} nouns={nouns} description="Буде видалено 3 юнітів." onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Видалити всі" }));

    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("Видалити всі юніти?")).toBeTruthy();
    expect(within(dialog).getByText("Буде видалено 3 юнітів.")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Видалити всі" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("uses custom label and title, and is disabled while pending", () => {
    renderWithConfirm(<DeleteAllButton count={2} nouns={nouns} description="x" label="Видалити всіх" title="Видалити всіх персонажів?" pending onConfirm={vi.fn()} />);

    expect((screen.getByRole("button", { name: "Видалити всіх" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
