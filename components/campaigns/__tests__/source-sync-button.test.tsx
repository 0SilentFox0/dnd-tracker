// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SourceSyncButton } from "@/components/campaigns/templates/SourceSyncButton";

const dialog = vi.hoisted(() => vi.fn());

vi.mock("@/components/campaigns/templates/SourceSyncDialog", () => ({
  SourceSyncDialog: (props: { open: boolean }) => {
    dialog(props);

    return null;
  },
}));

describe("SourceSyncButton", () => {
  afterEach(() => {
    cleanup();
    dialog.mockClear();
  });

  it("текст залежить від isTemplate", () => {
    const { unmount } = render(<SourceSyncButton campaignId="c1" isTemplate={false} />);

    expect(screen.getByRole("button", { name: "Оновлення з шаблону" })).toBeTruthy();
    unmount();
    render(<SourceSyncButton campaignId="c1" isTemplate />);
    expect(screen.getByRole("button", { name: "Оновлення з джерела" })).toBeTruthy();
  });

  it("клік відкриває діалог", () => {
    render(<SourceSyncButton campaignId="c1" isTemplate={false} />);
    expect(dialog.mock.calls.at(-1)?.[0].open).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Оновлення з шаблону" }));
    expect(dialog.mock.calls.at(-1)?.[0]).toMatchObject({ open: true, campaignId: "c1", isTemplate: false });
  });
});
